package models

import "time"

type Monitor struct {
	ID                     string            `json:"id,omitempty" db:"id"`
	UserID                 string            `json:"user_id,omitempty" db:"user_id"`
	Name                   string            `json:"name" db:"name"`
	URL                    string            `json:"url" db:"url"`
	Method                 string            `json:"method,omitempty" db:"method"`
	IntervalSec            int               `json:"interval_sec" db:"interval_sec"`
	IsActive               bool              `json:"is_active,omitempty" db:"is_active"`
	Headers                map[string]string `json:"headers,omitempty" db:"headers"`
	Keyword                string            `json:"keyword,omitempty" db:"keyword"`
	ExpectedStatus         int               `json:"expected_status" db:"expected_status"`
	TimeoutSec             int               `json:"timeout_sec" db:"timeout_sec"`
	IncidentThreshold      int               `json:"incident_threshold" db:"incident_threshold"`
	CreatedAt              *time.Time        `json:"created_at,omitempty" db:"created_at"`
	Description            string            `json:"description,omitempty" db:"description"`
	SSLCheckEnabled        bool              `json:"ssl_check_enabled" db:"ssl_check_enabled"`
	SSLExpiryThresholdDays int               `json:"ssl_expiry_threshold_days" db:"ssl_expiry_threshold_days"`
	SSLNotifyDays          []int             `json:"ssl_notify_days" db:"ssl_notify_days"`
}

type SSLCheck struct {
	ID            string     `json:"id,omitempty" db:"id"`
	MonitorID     string     `json:"monitor_id" db:"monitor_id"`
	CheckedAt     time.Time  `json:"checked_at" db:"checked_at"`
	ExpiryDate    *time.Time `json:"expiry_date" db:"expiry_date"`
	DaysRemaining int        `json:"days_remaining" db:"days_remaining"`
	IsValid       bool       `json:"is_valid" db:"is_valid"`
	ErrorMessage  string     `json:"error_message,omitempty" db:"error_message"`
}

type UserPreferences struct {
	UserID                string     `json:"user_id" db:"user_id"`
	Timezone              string     `json:"timezone" db:"timezone"`
	SSLAlertThresholdDays int        `json:"ssl_alert_threshold_days" db:"ssl_alert_threshold_days"`
	CreatedAt             *time.Time `json:"created_at,omitempty" db:"created_at"`
	UpdatedAt             *time.Time `json:"updated_at,omitempty" db:"updated_at"`
}

type Ping struct {
	ID           string    `json:"id,omitempty" db:"id"`
	MonitorID    string    `json:"monitor_id" db:"monitor_id"`
	CheckedAt    time.Time `json:"checked_at,omitempty" db:"checked_at"`
	StatusCode   int       `json:"status_code" db:"status_code"`
	LatencyMs    int       `json:"latency_ms" db:"latency_ms"`
	DnsMs        int       `json:"dns_ms" db:"dns_ms"`
	TlsMs        int       `json:"tls_ms" db:"tls_ms"`
	IsUp         bool      `json:"is_up" db:"is_up"`
	ErrorMessage string    `json:"error_message,omitempty" db:"error_message"`
}

type Incident struct {
	ID         string     `json:"id,omitempty" db:"id"`
	MonitorID  string     `json:"monitor_id" db:"monitor_id"`
	StartedAt  time.Time  `json:"started_at,omitempty" db:"started_at"`
	ResolvedAt *time.Time `json:"resolved_at,omitempty" db:"resolved_at"`
	IsResolved bool       `json:"is_resolved" db:"is_resolved"`
}

type StatusPage struct {
	ID        string     `json:"id,omitempty" db:"id"`
	UserID    string     `json:"user_id,omitempty" db:"user_id"`
	Slug      string     `json:"slug" db:"slug"`
	Title     string     `json:"title" db:"title"`
	IsPublic  bool       `json:"is_public" db:"is_public"`
	CreatedAt *time.Time `json:"created_at,omitempty" db:"created_at"`
}

type StatusPageMonitor struct {
	StatusPageID string `json:"status_page_id" db:"status_page_id"`
	MonitorID    string `json:"monitor_id" db:"monitor_id"`
}

type AlertChannel struct {
	ID        string                 `json:"id,omitempty" db:"id"`
	UserID    string                 `json:"user_id,omitempty" db:"user_id"`
	Name      string                 `json:"name" db:"name"`
	Type      string                 `json:"type" db:"type"`
	Config    map[string]interface{} `json:"config" db:"config"`
	IsActive  bool                   `json:"is_active" db:"is_active"`
	CreatedAt *time.Time             `json:"created_at,omitempty" db:"created_at"`
}

type MonitorAlertChannel struct {
	MonitorID      string `json:"monitor_id" db:"monitor_id"`
	AlertChannelID string `json:"alert_channel_id" db:"alert_channel_id"`
}
