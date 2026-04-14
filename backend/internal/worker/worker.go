package worker

import (
	"context"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/http/httptrace"
	"strings"
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
	failures   map[string]int
	mu         sync.RWMutex
	httpClient *http.Client
}

func NewWorker() *Worker {
	return &Worker{
		monitors:   make(map[string]*models.Monitor),
		stopChans:  make(map[string]chan struct{}),
		failures:   make(map[string]int),
		httpClient: &http.Client{},
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
			w.failures[m.ID] = 0
			stopChan := make(chan struct{})
			w.stopChans[m.ID] = stopChan
			go w.runMonitor(m, stopChan)
		} else {
			w.monitors[m.ID] = m
		}
	}

	// Stop monitors that are no longer active
	for id, stopChan := range w.stopChans {
		if _, ok := activeIDs[id]; !ok {
			close(stopChan)
			delete(w.stopChans, id)
			delete(w.monitors, id)
			delete(w.failures, id)
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

func (w *Worker) doPing(m *models.Monitor) models.Ping {
	var dnsStart, dnsEnd, tlsStart, tlsEnd time.Time
	trace := &httptrace.ClientTrace{
		DNSStart: func(info httptrace.DNSStartInfo) { dnsStart = time.Now() },
		DNSDone:  func(info httptrace.DNSDoneInfo) { dnsEnd = time.Now() },
		TLSHandshakeStart: func() { tlsStart = time.Now() },
		TLSHandshakeDone: func(state tls.ConnectionState, err error) { tlsEnd = time.Now() },
	}

	timeout := m.TimeoutSec
	if timeout <= 0 {
		timeout = 10
	}
	ctx, cancel := context.WithTimeout(context.Background(), time.Duration(timeout)*time.Second)
	defer cancel()
	ctx = httptrace.WithClientTrace(ctx, trace)

	method := m.Method
	if method == "" {
		method = "GET"
	}

	req, err := http.NewRequestWithContext(ctx, method, m.URL, nil)
	if err != nil {
		return models.Ping{MonitorID: m.ID, CheckedAt: time.Now(), IsUp: false, ErrorMessage: err.Error()}
	}

	for k, v := range m.Headers {
		req.Header.Set(k, v)
	}

	start := time.Now()
	resp, err := w.httpClient.Do(req)
	latency := time.Since(start).Milliseconds()

	dnsMs := int(0)
	if !dnsStart.IsZero() && !dnsEnd.IsZero() {
		dnsMs = int(dnsEnd.Sub(dnsStart).Milliseconds())
	}
	tlsMs := int(0)
	if !tlsStart.IsZero() && !tlsEnd.IsZero() {
		tlsMs = int(tlsEnd.Sub(tlsStart).Milliseconds())
	}

	ping := models.Ping{
		MonitorID:  m.ID,
		CheckedAt:  time.Now(),
		LatencyMs:  int(latency),
		DnsMs:      dnsMs,
		TlsMs:      tlsMs,
	}

	if err != nil {
		ping.IsUp = false
		ping.ErrorMessage = err.Error()
		return ping
	}
	defer resp.Body.Close()

	ping.StatusCode = resp.StatusCode

	expectedStatus := m.ExpectedStatus
	if expectedStatus == 0 {
		expectedStatus = 200
	}

	if resp.StatusCode != expectedStatus {
		ping.IsUp = false
		ping.ErrorMessage = fmt.Sprintf("Expected status %d, got %d", expectedStatus, resp.StatusCode)
		return ping
	}

	if m.Keyword != "" {
		bodyBytes, err := io.ReadAll(resp.Body)
		if err != nil {
			ping.IsUp = false
			ping.ErrorMessage = "Failed to read body: " + err.Error()
			return ping
		}
		if !strings.Contains(string(bodyBytes), m.Keyword) {
			ping.IsUp = false
			ping.ErrorMessage = fmt.Sprintf("Keyword '%s' not found in response", m.Keyword)
			return ping
		}
	}

	ping.IsUp = true
	return ping
}

func (w *Worker) ping(m *models.Monitor) {
	p := w.doPing(m)

	if !p.IsUp {
		time.Sleep(5 * time.Second)
		retryPing := w.doPing(m)
		if !retryPing.IsUp {
			retryPing.ErrorMessage = "Retry failed: " + retryPing.ErrorMessage
			p = retryPing
		} else {
			p = retryPing
		}
	}

	_, _, err := db.Client.From("pings").Insert(p, false, "", "", "exact").Execute()
	if err != nil {
		log.Printf("Error saving ping for %s: %v", m.Name, err)
	}

	w.handleIncident(m, p.IsUp)
}

func (w *Worker) handleIncident(m *models.Monitor, isUp bool) {
	w.mu.Lock()
	if isUp {
		w.failures[m.ID] = 0
	} else {
		w.failures[m.ID]++
	}
	failCount := w.failures[m.ID]
	w.mu.Unlock()

	threshold := m.IncidentThreshold
	if threshold <= 0 {
		threshold = 1
	}

	var lastIncident []models.Incident
	data, _, err := db.Client.From("incidents").Select("*", "exact", false).Eq("monitor_id", m.ID).Order("started_at", &postgrest.OrderOpts{Ascending: false}).Limit(1, "").Execute()
	if err == nil {
		_ = json.Unmarshal(data, &lastIncident)
	}

	hasActiveIncident := len(lastIncident) > 0 && !lastIncident[0].IsResolved

	if !isUp && failCount >= threshold && !hasActiveIncident {
		newIncident := models.Incident{
			MonitorID:  m.ID,
			StartedAt:  time.Now(),
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
