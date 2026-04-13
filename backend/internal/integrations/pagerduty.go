package integrations

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
)

type PagerDutyEvent struct {
	Payload   PagerDutyPayload `json:"payload"`
	RoutingKey string           `json:"routing_key"`
	EventAction string          `json:"event_action"`
	DedupKey    string          `json:"dedup_key,omitempty"`
}

type PagerDutyPayload struct {
	Summary  string `json:"summary"`
	Source   string `json:"source"`
	Severity string `json:"severity"`
}

func FirePagerDutyAlert(summary, source, dedupKey string) error {
	routingKey := os.Getenv("PAGERDUTY_ROUTING_KEY")
	if routingKey == "" {
		return fmt.Errorf("PAGERDUTY_ROUTING_KEY is not set")
	}

	event := PagerDutyEvent{
		RoutingKey:  routingKey,
		EventAction: "trigger",
		DedupKey:    dedupKey,
		Payload: PagerDutyPayload{
			Summary:  summary,
			Source:   source,
			Severity: "critical",
		},
	}

	body, err := json.Marshal(event)
	if err != nil {
		return err
	}

	resp, err := http.Post("https://events.pagerduty.com/v2/enqueue", "application/json", bytes.NewBuffer(body))
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusAccepted {
		return fmt.Errorf("pagerduty returned status: %d", resp.StatusCode)
	}

	return nil
}

func ResolvePagerDutyAlert(dedupKey string) error {
	routingKey := os.Getenv("PAGERDUTY_ROUTING_KEY")
	if routingKey == "" {
		return fmt.Errorf("PAGERDUTY_ROUTING_KEY is not set")
	}

	event := PagerDutyEvent{
		RoutingKey:  routingKey,
		EventAction: "resolve",
		DedupKey:    dedupKey,
	}

	body, err := json.Marshal(event)
	if err != nil {
		return err
	}

	resp, err := http.Post("https://events.pagerduty.com/v2/enqueue", "application/json", bytes.NewBuffer(body))
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusAccepted {
		return fmt.Errorf("pagerduty returned status: %d", resp.StatusCode)
	}

	return nil
}
