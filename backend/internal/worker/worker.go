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
	"github.com/ontriage/backend/internal/hub"
	"github.com/ontriage/backend/internal/integrations"
	"github.com/ontriage/backend/internal/models"
	"github.com/supabase-community/postgrest-go"
)

type Worker struct {
	monitors     map[string]*models.Monitor
	stopChans    map[string]chan struct{}
	failures     map[string]int
	lastStatus   map[string]bool
	lastSSLAlert map[string]int
	mu           sync.RWMutex
	httpClient   *http.Client
	hub          *hub.Hub
}

func NewWorker(h *hub.Hub) *Worker {
	return &Worker{
		monitors:     make(map[string]*models.Monitor),
		stopChans:    make(map[string]chan struct{}),
		failures:     make(map[string]int),
		lastStatus:   make(map[string]bool),
		lastSSLAlert: make(map[string]int),
		httpClient:   &http.Client{},
		hub:          h,
	}
}

func (w *Worker) Start(ctx context.Context) {
	log.Println("Starting ping worker...")
	w.reloadMonitors()

	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	go w.sslLoop(ctx)

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
			delete(w.lastStatus, id)
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

	data, _, err := db.Client.From("pings").Insert(p, false, "", "", "exact").Execute()
	if err != nil {
		log.Printf("Error saving ping for %s: %v", m.Name, err)
	} else {
		var inserted []models.Ping
		if json.Unmarshal(data, &inserted) == nil && len(inserted) > 0 {
			p = inserted[0]
		}
	}

	w.hub.SendToUser(m.UserID, hub.Event{
		Type:    "ping.result",
		Payload: p,
	})

	w.mu.Lock()
	lastUp, ok := w.lastStatus[m.ID]
	w.mu.Unlock()

	if !ok || lastUp != p.IsUp {
		w.mu.Lock()
		w.lastStatus[m.ID] = p.IsUp
		w.mu.Unlock()

		w.hub.SendToUser(m.UserID, hub.Event{
			Type: "monitor.status_changed",
			Payload: map[string]interface{}{
				"monitor_id": m.ID,
				"name":       m.Name,
				"is_up":      p.IsUp,
				"checked_at": p.CheckedAt,
			},
		})
	}

	w.handleIncident(m, p, p.IsUp)
}

func (w *Worker) handleIncident(m *models.Monitor, p models.Ping, isUp bool) {
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
		data, _, err = db.Client.From("incidents").Insert(newIncident, false, "", "", "exact").Execute()
		if err == nil {
			var inserted []models.Incident
			if json.Unmarshal(data, &inserted) == nil && len(inserted) > 0 {
				newIncident = inserted[0]
			}
			w.hub.SendToUser(m.UserID, hub.Event{
				Type: "incident.created",
				Payload: map[string]interface{}{
					"incident":     newIncident,
					"monitor_name": m.Name,
				},
			})
			w.fireAlerts(m, newIncident, p, false)
		}
	} else if isUp && hasActiveIncident {
		resolvedAt := time.Now()
		_, _, err = db.Client.From("incidents").Update(map[string]interface{}{
			"resolved_at": resolvedAt,
			"is_resolved": true,
		}, "", "exact").Eq("id", lastIncident[0].ID).Execute()

		if err == nil {
			lastIncident[0].ResolvedAt = &resolvedAt
			lastIncident[0].IsResolved = true
			w.hub.SendToUser(m.UserID, hub.Event{
				Type: "incident.resolved",
				Payload: map[string]interface{}{
					"incident":     lastIncident[0],
					"monitor_name": m.Name,
				},
			})
			w.fireAlerts(m, lastIncident[0], p, true)
		}
	}
}

func (w *Worker) fireAlerts(m *models.Monitor, incident models.Incident, lastPing models.Ping, isResolve bool) {
	var macs []models.MonitorAlertChannel
	data, _, err := db.Client.From("monitor_alert_channels").Select("*", "exact", false).Eq("monitor_id", m.ID).Execute()
	if err == nil {
		_ = json.Unmarshal(data, &macs)
	}

	if len(macs) == 0 {
		if isResolve {
			_ = integrations.ResolvePagerDutyAlert(m.ID, "")
		} else {
			_ = integrations.FirePagerDutyAlert(fmt.Sprintf("Monitor Down: %s", m.Name), m.URL, m.ID, "")
		}
		return
	}

	channelIDs := make([]string, len(macs))
	for i, mac := range macs {
		channelIDs[i] = mac.AlertChannelID
	}

	var channels []models.AlertChannel
	cData, _, err := db.Client.From("alert_channels").Select("*", "exact", false).In("id", channelIDs).Eq("is_active", "true").Execute()
	if err == nil {
		_ = json.Unmarshal(cData, &channels)
	}

	for _, ch := range channels {
		if isResolve {
			_ = integrations.ResolveAlert(ch, *m, incident, lastPing)
		} else {
			_ = integrations.FireAlert(ch, *m, incident, lastPing)
		}
	}
}
