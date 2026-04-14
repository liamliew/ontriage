package worker

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/ontriage/backend/internal/db"
	"github.com/ontriage/backend/internal/integrations"
	"github.com/ontriage/backend/internal/models"
	"github.com/supabase-community/postgrest-go"
)

type Worker struct {
	monitors   map[string]*models.Monitor
	stopChans  map[string]chan struct{}
	mu         sync.RWMutex
	httpClient *http.Client
}

func NewWorker() *Worker {
	return &Worker{
		monitors:   make(map[string]*models.Monitor),
		stopChans:  make(map[string]chan struct{}),
		httpClient: &http.Client{Timeout: 10 * time.Second},
	}
}

func (w *Worker) Start(ctx context.Context) {
	log.Println("Starting ping worker...")
	w.reloadMonitors()

	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			w.stopAll()
			return
		case <-ticker.C:
			w.reloadMonitors()
		}
	}
}

func (w *Worker) reloadMonitors() {
	var monitors []models.Monitor
	data, _, err := db.Client.From("monitors").Select("*", "exact", false).Eq("is_active", "true").Execute()
	if err != nil {
		log.Printf("Error loading monitors: %v", err)
		return
	}
	if err := json.Unmarshal(data, &monitors); err != nil {
		log.Printf("Error unmarshaling monitors: %v", err)
		return
	}

	w.mu.Lock()
	defer w.mu.Unlock()

	activeIDs := make(map[string]struct{})
	for i := range monitors {
		m := &monitors[i]
		activeIDs[m.ID] = struct{}{}

		if _, ok := w.monitors[m.ID]; !ok {
			// New monitor
			w.monitors[m.ID] = m
			stopChan := make(chan struct{})
			w.stopChans[m.ID] = stopChan
			go w.runMonitor(m, stopChan)
		} else {
			// Check if interval changed or other updates
			// For simplicity, we just update the monitor object
			w.monitors[m.ID] = m
		}
	}

	// Stop monitors that are no longer active
	for id, stopChan := range w.stopChans {
		if _, ok := activeIDs[id]; !ok {
			close(stopChan)
			delete(w.stopChans, id)
			delete(w.monitors, id)
		}
	}
}

func (w *Worker) stopAll() {
	w.mu.Lock()
	defer w.mu.Unlock()
	for _, stopChan := range w.stopChans {
		close(stopChan)
	}
}

func (w *Worker) runMonitor(m *models.Monitor, stopChan chan struct{}) {
	interval := m.IntervalSec
	if interval <= 0 {
		log.Printf("Monitor %s has invalid interval %d, defaulting to 60s", m.ID, interval)
		interval = 60
	}
	ticker := time.NewTicker(time.Duration(interval) * time.Second)
	defer ticker.Stop()

	// Perform initial ping immediately
	w.ping(m)

	for {
		select {
		case <-stopChan:
			return
		case <-ticker.C:
			w.ping(m)
		}
	}
}

func (w *Worker) ping(m *models.Monitor) {
	start := time.Now()
	resp, err := w.httpClient.Get(m.URL)
	latency := time.Since(start).Milliseconds()

	isUp := err == nil && resp.StatusCode >= 200 && resp.StatusCode < 400
	statusCode := 0
	errMsg := ""
	if err != nil {
		errMsg = err.Error()
	} else {
		statusCode = resp.StatusCode
		resp.Body.Close()
	}

	// Record ping
	ping := models.Ping{
		MonitorID:    m.ID,
		CheckedAt:    time.Now(),
		StatusCode:   statusCode,
		LatencyMs:    int(latency),
		IsUp:         isUp,
		ErrorMessage: errMsg,
	}

	_, _, err = db.Client.From("pings").Insert(ping, false, "", "", "exact").Execute()
	if err != nil {
		log.Printf("Error saving ping for %s: %v", m.Name, err)
	}

	// Handle incidents and alerts
	w.handleIncident(m, isUp)
}

func (w *Worker) handleIncident(m *models.Monitor, isUp bool) {
	// Check current state from DB or cache
	// For simplicity, we query the last incident for this monitor
	var lastIncident []models.Incident
	data, _, err := db.Client.From("incidents").Select("*", "exact", false).Eq("monitor_id", m.ID).Order("started_at", &postgrest.OrderOpts{Ascending: false}).Limit(1, "").Execute()
	if err == nil {
		_ = json.Unmarshal(data, &lastIncident)
	}
	
	hasActiveIncident := len(lastIncident) > 0 && !lastIncident[0].IsResolved

	if !isUp && !hasActiveIncident {
		// Create new incident
		newIncident := models.Incident{
			MonitorID: m.ID,
			StartedAt: time.Now(),
			IsResolved: false,
		}
		_, _, err = db.Client.From("incidents").Insert(newIncident, false, "", "", "exact").Execute()
		if err == nil {
			_ = integrations.FirePagerDutyAlert(
				fmt.Sprintf("Monitor Down: %s", m.Name),
				m.URL,
				m.ID,
			)
		}
	} else if isUp && hasActiveIncident {
		// Resolve incident
		resolvedAt := time.Now()
		_, _, err = db.Client.From("incidents").Update(map[string]interface{}{
			"resolved_at": resolvedAt,
			"is_resolved": true,
		}, "", "exact").Eq("id", lastIncident[0].ID).Execute()
		
		if err == nil {
			_ = integrations.ResolvePagerDutyAlert(m.ID)
		}
	}
}
