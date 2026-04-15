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

	"github.com/ontriage/backend/internal/models"
)

func FireAlert(channel models.AlertChannel, monitor models.Monitor, incident models.Incident) error {
	switch channel.Type {
	case "pagerduty":
		routingKey, _ := channel.Config["routing_key"].(string)
		return FirePagerDutyAlert(fmt.Sprintf("Monitor Down: %s", monitor.Name), monitor.URL, monitor.ID, routingKey)
	case "email":
		to, _ := channel.Config["to"].(string)
		return sendEmail(to, fmt.Sprintf("[OnTriage] Monitor down: %s", monitor.Name), fmt.Sprintf("Monitor name: %s\nURL: %s\nTime down: %s\nLink: https://on.triage.lt/dashboard/monitors/%s", monitor.Name, monitor.URL, incident.StartedAt.Format("2006-01-02 15:04:05 MST"), monitor.ID))
	case "webhook":
		url, _ := channel.Config["url"].(string)
		secret, _ := channel.Config["secret"].(string)
		return sendWebhook(url, secret, "incident.created", monitor, incident)
	case "slack":
		webhookURL, _ := channel.Config["webhook_url"].(string)
		return sendSlack(webhookURL, fmt.Sprintf(":red_circle: *Monitor down: %s*\n%s is not responding.\nStarted at %s", monitor.Name, monitor.URL, incident.StartedAt.Format("2006-01-02 15:04:05 MST")))
	default:
		return fmt.Errorf("unknown alert channel type: %s", channel.Type)
	}
}

func ResolveAlert(channel models.AlertChannel, monitor models.Monitor, incident models.Incident) error {
	switch channel.Type {
	case "pagerduty":
		routingKey, _ := channel.Config["routing_key"].(string)
		return ResolvePagerDutyAlert(monitor.ID, routingKey)
	case "email":
		to, _ := channel.Config["to"].(string)
		return sendEmail(to, fmt.Sprintf("[OnTriage] Monitor recovered: %s", monitor.Name), fmt.Sprintf("Monitor name: %s\nURL: %s\nTime down: %s\nLink: https://on.triage.lt/dashboard/monitors/%s", monitor.Name, monitor.URL, incident.StartedAt.Format("2006-01-02 15:04:05 MST"), monitor.ID))
	case "webhook":
		url, _ := channel.Config["url"].(string)
		secret, _ := channel.Config["secret"].(string)
		return sendWebhook(url, secret, "incident.resolved", monitor, incident)
	case "slack":
		webhookURL, _ := channel.Config["webhook_url"].(string)
		return sendSlack(webhookURL, fmt.Sprintf(":green_circle: *Monitor recovered: %s*\n%s is back up.", monitor.Name, monitor.URL))
	default:
		return fmt.Errorf("unknown alert channel type: %s", channel.Type)
	}
}

func sendEmail(to, subject, text string) error {
	apiKey := os.Getenv("RESEND_API_KEY")
	if apiKey == "" {
		return fmt.Errorf("RESEND_API_KEY is not set")
	}
	payload := map[string]interface{}{
		"from":    "alerts@triage.lt",
		"to":      []string{to},
		"subject": subject,
		"text":    text,
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

func sendWebhook(url, secret, event string, monitor models.Monitor, incident models.Incident) error {
	payload := map[string]interface{}{
		"event":    event,
		"monitor":  map[string]string{"id": monitor.ID, "name": monitor.Name, "url": monitor.URL},
		"incident": map[string]string{"id": incident.ID, "started_at": incident.StartedAt.Format("2006-01-02T15:04:05Z07:00")},
	}
	body, _ := json.Marshal(payload)
	req, _ := http.NewRequest("POST", url, bytes.NewBuffer(body))
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
