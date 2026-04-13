package models

import "time"

type Monitor struct {
	ID          string    `json:"id" db:"id"`
	UserID      string    `json:"user_id" db:"user_id"`
	Name        string    `json:"name" db:"name"`
	URL         string    `json:"url" db:"url"`
	Method      string    `json:"method" db:"method"`
	IntervalSec int       `json:"interval_sec" db:"interval_sec"`
	IsActive    bool      `json:"is_active" db:"is_active"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
}

type Ping struct {
	ID           string    `json:"id" db:"id"`
	MonitorID    string    `json:"monitor_id" db:"monitor_id"`
	CheckedAt    time.Time `json:"checked_at" db:"checked_at"`
	StatusCode   int       `json:"status_code" db:"status_code"`
	LatencyMs    int       `json:"latency_ms" db:"latency_ms"`
	IsUp         bool      `json:"is_up" db:"is_up"`
	ErrorMessage string    `json:"error_message" db:"error_message"`
}

type Incident struct {
	ID         string     `json:"id" db:"id"`
	MonitorID  string     `json:"monitor_id" db:"monitor_id"`
	StartedAt  time.Time  `json:"started_at" db:"started_at"`
	ResolvedAt *time.Time `json:"resolved_at" db:"resolved_at"`
	IsResolved bool       `json:"is_resolved" db:"is_resolved"`
}

type StatusPage struct {
	ID        string    `json:"id" db:"id"`
	UserID    string    `json:"user_id" db:"user_id"`
	Slug      string    `json:"slug" db:"slug"`
	Title     string    `json:"title" db:"title"`
	IsPublic  bool      `json:"is_public" db:"is_public"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}

type StatusPageMonitor struct {
	StatusPageID string `json:"status_page_id" db:"status_page_id"`
	MonitorID    string `json:"monitor_id" db:"monitor_id"`
}
