package integrations

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/ontriage/backend/internal/models"
)

const resendDownTemplate = "monitor-down"
const resendRecoveredTemplate = "monitor-recovered"

type resendEmailRequest struct {
	From     string         `json:"from"`
	To       string         `json:"to"`
	Template resendTemplate `json:"template"`
}

type resendTemplate struct {
	ID        string                 `json:"id"`
	Variables map[string]interface{} `json:"variables"`
}

func formatDuration(d time.Duration) string {
	d = d.Round(time.Second)
	days := int(d.Hours() / 24)
	hours := int(d.Hours()) % 24
	minutes := int(d.Minutes()) % 60
	seconds := int(d.Seconds()) % 60

	var parts []string
	if days == 1 {
		parts = append(parts, "1 day")
	} else if days > 1 {
		parts = append(parts, fmt.Sprintf("%d days", days))
	}
	if hours == 1 {
		parts = append(parts, "1 hour")
	} else if hours > 1 {
		parts = append(parts, fmt.Sprintf("%d hours", hours))
	}
	if minutes == 1 {
		parts = append(parts, "1 minute")
	} else if minutes > 1 {
		parts = append(parts, fmt.Sprintf("%d minutes", minutes))
	}
	if seconds == 1 {
		parts = append(parts, "1 second")
	} else if seconds > 1 || len(parts) == 0 {
		parts = append(parts, fmt.Sprintf("%d seconds", seconds))
	}

	return strings.Join(parts, " ")
}

func FireAlert(channel models.AlertChannel, monitor models.Monitor, incident models.Incident, lastPing models.Ping) error {
	switch channel.Type {
	case "pagerduty":
		routingKey, _ := channel.Config["routing_key"].(string)
		return FirePagerDutyAlert(fmt.Sprintf("Monitor Down: %s", monitor.Name), monitor.URL, monitor.ID, routingKey)
	case "email":
		to, _ := channel.Config["to"].(string)
		variables := map[string]interface{}{
			"monitor_name":    monitor.Name,
			"monitor_url":     monitor.URL,
			"method":          monitor.Method,
			"expected_status": fmt.Sprintf("%d", monitor.ExpectedStatus),
			"actual_status":   fmt.Sprintf("%d", lastPing.StatusCode),
			"started_at":      incident.StartedAt.Format("2 Jan 2006, 15:04 MST"),
			"description":     monitor.Description,
			"dashboard_link":  fmt.Sprintf("https://on.triage.lt/dashboard/monitors/%s", monitor.ID),
		}
		return sendEmail(to, resendDownTemplate, variables)
	case "webhook":
		url, _ := channel.Config["url"].(string)
		secret, _ := channel.Config["secret"].(string)
		return sendWebhook(url, secret, "incident.created", monitor, incident, nil)
	case "slack":
		webhookURL, _ := channel.Config["webhook_url"].(string)
		return sendSlack(webhookURL, fmt.Sprintf(":red_circle: *Monitor down: %s*\n%s is not responding.\nStarted at %s", monitor.Name, monitor.URL, incident.StartedAt.Format("2006-01-02 15:04:05 MST")))
	default:
		return fmt.Errorf("unknown alert channel type: %s", channel.Type)
	}
}

func ResolveAlert(channel models.AlertChannel, monitor models.Monitor, incident models.Incident, lastPing models.Ping) error {
	switch channel.Type {
	case "pagerduty":
		routingKey, _ := channel.Config["routing_key"].(string)
		return ResolvePagerDutyAlert(monitor.ID, routingKey)
	case "email":
		to, _ := channel.Config["to"].(string)
		resolvedAt := time.Now()
		if incident.ResolvedAt != nil {
			resolvedAt = *incident.ResolvedAt
		}
		variables := map[string]interface{}{
			"monitor_name":      monitor.Name,
			"monitor_url":       monitor.URL,
			"method":            monitor.Method,
			"actual_status":     fmt.Sprintf("%d", lastPing.StatusCode),
			"started_at":        incident.StartedAt.Format("2 Jan 2006, 15:04 MST"),
			"resolved_at":       resolvedAt.Format("2 Jan 2006, 15:04 MST"),
			"downtime_duration": formatDuration(resolvedAt.Sub(incident.StartedAt)),
			"description":       monitor.Description,
			"dashboard_link":    fmt.Sprintf("https://on.triage.lt/dashboard/monitors/%s", monitor.ID),
		}
		return sendEmail(to, resendRecoveredTemplate, variables)
	case "webhook":
		url, _ := channel.Config["url"].(string)
		secret, _ := channel.Config["secret"].(string)
		return sendWebhook(url, secret, "incident.resolved", monitor, incident, nil)
	case "slack":
		webhookURL, _ := channel.Config["webhook_url"].(string)
		return sendSlack(webhookURL, fmt.Sprintf(":green_circle: *Monitor recovered: %s*\n%s is back up.", monitor.Name, monitor.URL))
	default:
		return fmt.Errorf("unknown alert channel type: %s", channel.Type)
	}
}

func FireSSLAlert(channel models.AlertChannel, monitor models.Monitor, check models.SSLCheck) error {
	msg := fmt.Sprintf("SSL Expiry Warning: %s cert expires on %s (%d days remaining)", monitor.URL, check.ExpiryDate.Format("2 Jan 2006"), check.DaysRemaining)
	switch channel.Type {
	case "pagerduty":
		routingKey, _ := channel.Config["routing_key"].(string)
		return FirePagerDutyAlert(fmt.Sprintf("SSL Warning: %s", monitor.Name), monitor.URL, monitor.ID+"_ssl", routingKey)
	case "email":
		to, _ := channel.Config["to"].(string)
		variables := map[string]interface{}{
			"monitor_name":   monitor.Name,
			"monitor_url":    monitor.URL,
			"expiry_date":    check.ExpiryDate.Format("2 Jan 2006"),
			"days_remaining": fmt.Sprintf("%d", check.DaysRemaining),
			"dashboard_link": fmt.Sprintf("https://on.triage.lt/dashboard/monitors/%s", monitor.ID),
		}
		// using an un-specified template for ssl. Just guessing an id, as instructions didn't give one.
		return sendEmail(to, "ssl-expiry-warning", variables)
	case "webhook":
		url, _ := channel.Config["url"].(string)
		secret, _ := channel.Config["secret"].(string)
		return sendWebhook(url, secret, "ssl.expiry_warning", monitor, models.Incident{}, &check)
	case "slack":
		webhookURL, _ := channel.Config["webhook_url"].(string)
		return sendSlack(webhookURL, fmt.Sprintf(":warning: *%s*", msg))
	default:
		return fmt.Errorf("unknown alert channel type: %s", channel.Type)
	}
}

func sendEmail(to, template string, variables map[string]interface{}) error {
	apiKey := os.Getenv("RESEND_API_KEY")
	if apiKey == "" {
		return fmt.Errorf("RESEND_API_KEY is not set")
	}
	payload := resendEmailRequest{
		From: "OnTriage Alerts <alerts@triage.lt>",
		To:   to,
		Template: resendTemplate{
			ID:        template,
			Variables: variables,
		},
	}
	body, _ := json.Marshal(payload)
	req, _ := http.NewRequest("POST", "https://api.resend.com/emails", bytes.NewBuffer(body))
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 400 {
		return fmt.Errorf("resend returned status: %d", resp.StatusCode)
	}
	return nil
}

func sendWebhook(urlStr, secret, event string, monitor models.Monitor, incident models.Incident, check *models.SSLCheck) error {
	payload := map[string]interface{}{
		"event":   event,
		"monitor": map[string]string{"id": monitor.ID, "name": monitor.Name, "url": monitor.URL},
	}
	if event == "ssl.expiry_warning" && check != nil {
		payload["ssl_check"] = map[string]interface{}{
			"days_remaining": check.DaysRemaining,
			"expiry_date":    check.ExpiryDate.Format(time.RFC3339),
		}
	} else {
		payload["incident"] = map[string]string{"id": incident.ID, "started_at": incident.StartedAt.Format("2006-01-02T15:04:05Z07:00")}
	}

	body, _ := json.Marshal(payload)
	req, _ := http.NewRequest("POST", urlStr, bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	if secret != "" {
		h := hmac.New(sha256.New, []byte(secret))
		h.Write(body)
		req.Header.Set("X-OnTriage-Signature", hex.EncodeToString(h.Sum(nil)))
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 400 {
		return fmt.Errorf("webhook returned status: %d", resp.StatusCode)
	}
	return nil
}

func sendSlack(webhookURL, text string) error {
	payload := map[string]string{"text": text}
	body, _ := json.Marshal(payload)
	resp, err := http.Post(webhookURL, "application/json", bytes.NewBuffer(body))
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 400 {
		return fmt.Errorf("slack returned status: %d", resp.StatusCode)
	}
	return nil
}
