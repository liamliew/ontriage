package worker

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"encoding/json"
	"fmt"
	"log"
	"net"
	"net/url"
	"strings"
	"time"

	"github.com/ontriage/backend/internal/db"
	"github.com/ontriage/backend/internal/hub"
	"github.com/ontriage/backend/internal/integrations"
	"github.com/ontriage/backend/internal/models"
)

type SSLResult struct {
	ExpiryDate    time.Time
	DaysRemaining int
	IsValid       bool
}

func checkSSL(monitorURL string, timeoutSec int) (*SSLResult, error) {
	parsedURL, err := url.Parse(monitorURL)
	if err != nil {
		return nil, fmt.Errorf("invalid url: %w", err)
	}

	host := parsedURL.Host
	if !strings.Contains(host, ":") {
		host = host + ":443"
	}

	timeout := time.Duration(timeoutSec) * time.Second
	if timeout == 0 {
		timeout = 10 * time.Second
	}

	conn, err := tls.DialWithDialer(&net.Dialer{Timeout: timeout}, "tcp", host, &tls.Config{
		InsecureSkipVerify: true,
		ServerName:         parsedURL.Hostname(),
	})
	if err != nil {
		return nil, fmt.Errorf("tls dial error: %w", err)
	}
	defer conn.Close()

	certs := conn.ConnectionState().PeerCertificates
	if len(certs) == 0 {
		return nil, fmt.Errorf("no peer certificates found")
	}

	cert := certs[0]
	isValid := true
	now := time.Now()

	opts := x509.VerifyOptions{
		DNSName:       parsedURL.Hostname(),
		Intermediates: x509.NewCertPool(),
	}
	for _, c := range certs[1:] {
		opts.Intermediates.AddCert(c)
	}
	if _, err := cert.Verify(opts); err != nil {
		isValid = false
	}

	if now.After(cert.NotAfter) || now.Before(cert.NotBefore) {
		isValid = false
	}

	daysRemaining := int(cert.NotAfter.Sub(now).Hours() / 24)

	return &SSLResult{
		ExpiryDate:    cert.NotAfter,
		DaysRemaining: daysRemaining,
		IsValid:       isValid,
	}, nil
}

func (w *Worker) sslLoop(ctx context.Context) {
	ticker := time.NewTicker(24 * time.Hour)
	defer ticker.Stop()

	w.runSSLChecks()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			w.runSSLChecks()
		}
	}
}

func (w *Worker) runSSLChecks() {
	log.Println("Running SSL checks...")

	w.mu.RLock()
	var monitors []models.Monitor
	for _, m := range w.monitors {
		if m.IsActive && m.SSLCheckEnabled && strings.HasPrefix(m.URL, "https://") {
			monitors = append(monitors, *m)
		}
	}
	w.mu.RUnlock()

	for _, m := range monitors {
		res, err := checkSSL(m.URL, m.TimeoutSec)

		check := models.SSLCheck{
			MonitorID: m.ID,
			CheckedAt: time.Now(),
		}

		if err != nil {
			check.IsValid = false
			check.ErrorMessage = err.Error()
		} else {
			check.ExpiryDate = &res.ExpiryDate
			check.DaysRemaining = res.DaysRemaining
			check.IsValid = res.IsValid
		}

		_, _, dbErr := db.Client.From("ssl_checks").Insert(check, false, "", "", "exact").Execute()
		if dbErr != nil {
			log.Printf("Failed to insert SSL check for monitor %s: %v", m.ID, dbErr)
		}

		if check.DaysRemaining > 0 {
			needsAlert := false
			for _, notifyDay := range m.SSLNotifyDays {
				if check.DaysRemaining <= notifyDay {
					needsAlert = true
					break
				}
			}

			if needsAlert {
				w.mu.Lock()
				lastAlert, hasLast := w.lastSSLAlert[m.ID]
				if !hasLast || check.DaysRemaining < lastAlert {
					w.lastSSLAlert[m.ID] = check.DaysRemaining
					w.mu.Unlock()

					w.hub.SendToUser(m.UserID, hub.Event{
						Type: "ssl.expiry_warning",
						Payload: map[string]interface{}{
							"monitor_id":     m.ID,
							"name":           m.Name,
							"days_remaining": check.DaysRemaining,
							"expiry_date":    check.ExpiryDate,
						},
					})

					w.fireSSLAlerts(&m, check)
				} else {
					w.mu.Unlock()
				}
			}
		}
	}
}

func (w *Worker) fireSSLAlerts(m *models.Monitor, check models.SSLCheck) {
	var macs []models.MonitorAlertChannel
	data, _, err := db.Client.From("monitor_alert_channels").Select("*", "exact", false).Eq("monitor_id", m.ID).Execute()
	if err == nil {
		_ = json.Unmarshal(data, &macs)
	}

	if len(macs) == 0 {
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
		_ = integrations.FireSSLAlert(ch, *m, check)
	}
}
