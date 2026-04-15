package api

import (
	"encoding/json"
	"time"

	"github.com/getsentry/sentry-go"
	"github.com/gofiber/fiber/v2"
	"github.com/ontriage/backend/internal/db"
	"github.com/ontriage/backend/internal/models"
	"github.com/supabase-community/postgrest-go"
)

func GetMonitors(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	var monitors []models.Monitor
	data, _, err := db.Client.From("monitors").Select("*", "exact", false).Eq("user_id", userID).Execute()
	if err != nil {
		sentry.CaptureException(err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	_ = json.Unmarshal(data, &monitors)
	if monitors == nil {
		monitors = []models.Monitor{}
	}
	return c.JSON(monitors)
}

func CreateMonitor(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	var monitor models.Monitor
	if err := c.BodyParser(&monitor); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	monitor.UserID = userID

	data, _, err := db.Client.From("monitors").Insert(monitor, false, "", "", "exact").Execute()
	if err != nil {
		sentry.CaptureException(err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	
	// Try to unmarshal the returned data into our object (e.g. to get ID)
	var created []models.Monitor
	if err := json.Unmarshal(data, &created); err == nil && len(created) > 0 {
		monitor = created[0]
	}
	
	return c.Status(fiber.StatusCreated).JSON(monitor)
}

func UpdateMonitor(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	id := c.Params("id")
	var updates map[string]interface{}
	if err := c.BodyParser(&updates); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	_, _, err := db.Client.From("monitors").Update(updates, "", "exact").Eq("id", id).Eq("user_id", userID).Execute()
	if err != nil {
		sentry.CaptureException(err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.SendStatus(fiber.StatusOK)
}

func DeleteMonitor(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	id := c.Params("id")

	_, _, err := db.Client.From("monitors").Delete("", "exact").Eq("id", id).Eq("user_id", userID).Execute()
	if err != nil {
		sentry.CaptureException(err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.SendStatus(fiber.StatusNoContent)
}

func GetPings(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	id := c.Params("id")

	page := c.QueryInt("page", 1)
	limit := c.QueryInt("limit", 50)
	if limit > 200 {
		limit = 200
	}
	from := c.Query("from")
	to := c.Query("to")

	// Verify ownership
	_, _, err := db.Client.From("monitors").Select("id", "exact", false).Eq("id", id).Eq("user_id", userID).Single().Execute()
	if err != nil {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "forbidden"})
	}

	query := db.Client.From("pings").Select("*", "exact", false).Eq("monitor_id", id)
	if from != "" {
		query = query.Gte("checked_at", from)
	}
	if to != "" {
		query = query.Lte("checked_at", to)
	}

	offset := (page - 1) * limit
	data, count, err := query.Order("checked_at", &postgrest.OrderOpts{Ascending: false}).Range(offset, offset+limit-1, "").Execute()
	if err != nil {
		sentry.CaptureException(err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	
	var pings []models.Ping
	_ = json.Unmarshal(data, &pings)
	if pings == nil {
		pings = []models.Ping{}
	}
	
	return c.JSON(fiber.Map{
		"data":  pings,
		"page":  page,
		"limit": limit,
		"total": count,
	})
}

func GetIncidents(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	id := c.Params("id")

	// Verify ownership
	_, _, err := db.Client.From("monitors").Select("id", "exact", false).Eq("id", id).Eq("user_id", userID).Single().Execute()
	if err != nil {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "forbidden"})
	}

	var incidents []models.Incident
	data, _, err := db.Client.From("incidents").Select("*", "exact", false).Eq("monitor_id", id).Order("started_at", &postgrest.OrderOpts{Ascending: false}).Execute()
	if err != nil {
		sentry.CaptureException(err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	_ = json.Unmarshal(data, &incidents)
	if incidents == nil {
		incidents = []models.Incident{}
	}
	return c.JSON(incidents)
}

func GetUptime(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	id := c.Params("id")
	days := c.QueryInt("days", 30)

	// Verify ownership
	_, _, err := db.Client.From("monitors").Select("id", "exact", false).Eq("id", id).Eq("user_id", userID).Single().Execute()
	if err != nil {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "forbidden"})
	}

	fromTime := time.Now().AddDate(0, 0, -days).Format(time.RFC3339)

	var pings []models.Ping
	data, _, err := db.Client.From("pings").Select("is_up", "exact", false).Eq("monitor_id", id).Gte("checked_at", fromTime).Execute()
	if err != nil {
		sentry.CaptureException(err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	_ = json.Unmarshal(data, &pings)

	totalChecks := len(pings)
	upChecks := 0
	for _, p := range pings {
		if p.IsUp {
			upChecks++
		}
	}
	downChecks := totalChecks - upChecks

	uptimePercentage := float64(100)
	if totalChecks > 0 {
		uptimePercentage = float64(upChecks) / float64(totalChecks) * 100
	}

	return c.JSON(fiber.Map{
		"uptime_percentage": uptimePercentage,
		"total_checks":      totalChecks,
		"up_checks":         upChecks,
		"down_checks":       downChecks,
		"days":              days,
	})
}

func GetStats(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	id := c.Params("id")
	days := c.QueryInt("days", 7)

	// Verify ownership
	_, _, err := db.Client.From("monitors").Select("id", "exact", false).Eq("id", id).Eq("user_id", userID).Single().Execute()
	if err != nil {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "forbidden"})
	}

	fromTime := time.Now().AddDate(0, 0, -days).Format(time.RFC3339)

	var pings []models.Ping
	data, _, err := db.Client.From("pings").Select("latency_ms, is_up, checked_at", "exact", false).Eq("monitor_id", id).Gte("checked_at", fromTime).Execute()
	if err != nil {
		sentry.CaptureException(err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	_ = json.Unmarshal(data, &pings)

	type DailyStat struct {
		Date             string  `json:"date"`
		AvgLatencyMs     float64 `json:"avg_latency_ms"`
		MinLatencyMs     int     `json:"min_latency_ms"`
		MaxLatencyMs     int     `json:"max_latency_ms"`
		UptimePercentage float64 `json:"uptime_percentage"`
	}

	type statAgg struct {
		Date         string
		MinLatencyMs int
		MaxLatencyMs int
		totalLatency int
		count        int
		upCount      int
	}

	statsMap := make(map[string]*statAgg)

	for _, p := range pings {
		date := p.CheckedAt.Format("2006-01-02")
		if _, exists := statsMap[date]; !exists {
			statsMap[date] = &statAgg{
				Date:         date,
				MinLatencyMs: p.LatencyMs,
				MaxLatencyMs: p.LatencyMs,
			}
		}
		stat := statsMap[date]
		
		if p.LatencyMs < stat.MinLatencyMs {
			stat.MinLatencyMs = p.LatencyMs
		}
		if p.LatencyMs > stat.MaxLatencyMs {
			stat.MaxLatencyMs = p.LatencyMs
		}
		stat.totalLatency += p.LatencyMs
		stat.count++
		if p.IsUp {
			stat.upCount++
		}
	}

	var result []DailyStat
	for _, stat := range statsMap {
		avgLatency := float64(0)
		uptimePct := float64(0)
		if stat.count > 0 {
			avgLatency = float64(stat.totalLatency) / float64(stat.count)
			uptimePct = float64(stat.upCount) / float64(stat.count) * 100
		}
		result = append(result, DailyStat{
			Date:             stat.Date,
			AvgLatencyMs:     avgLatency,
			MinLatencyMs:     stat.MinLatencyMs,
			MaxLatencyMs:     stat.MaxLatencyMs,
			UptimePercentage: uptimePct,
		})
	}
	if result == nil {
		result = []DailyStat{}
	}

	return c.JSON(fiber.Map{
		"days": result,
	})
}

func GetStatusPages(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	var statusPages []models.StatusPage
	data, _, err := db.Client.From("status_pages").Select("*", "exact", false).Eq("user_id", userID).Execute()
	if err != nil {
		sentry.CaptureException(err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	_ = json.Unmarshal(data, &statusPages)
	if statusPages == nil {
		statusPages = []models.StatusPage{}
	}
	return c.JSON(statusPages)
}

func CreateStatusPage(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	var statusPage models.StatusPage
	if err := c.BodyParser(&statusPage); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	statusPage.UserID = userID

	data, _, err := db.Client.From("status_pages").Insert(statusPage, false, "", "", "exact").Execute()
	if err != nil {
		sentry.CaptureException(err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	
	var created []models.StatusPage
	if err := json.Unmarshal(data, &created); err == nil && len(created) > 0 {
		statusPage = created[0]
	}
	
	return c.Status(fiber.StatusCreated).JSON(statusPage)
}

func UpdateStatusPage(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	id := c.Params("id")
	var updates map[string]interface{}
	if err := c.BodyParser(&updates); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	_, _, err := db.Client.From("status_pages").Update(updates, "", "exact").Eq("id", id).Eq("user_id", userID).Execute()
	if err != nil {
		sentry.CaptureException(err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.SendStatus(fiber.StatusOK)
}

func DeleteStatusPage(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	id := c.Params("id")

	_, _, err := db.Client.From("status_pages").Delete("", "exact").Eq("id", id).Eq("user_id", userID).Execute()
	if err != nil {
		sentry.CaptureException(err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.SendStatus(fiber.StatusNoContent)
}

func AddMonitorToStatusPage(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	id := c.Params("id")
	
	var payload struct {
		MonitorID string `json:"monitor_id"`
	}
	if err := c.BodyParser(&payload); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	// Verify ownership of status page
	_, _, err := db.Client.From("status_pages").Select("id", "exact", false).Eq("id", id).Eq("user_id", userID).Single().Execute()
	if err != nil {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "forbidden"})
	}
	
	// Verify ownership of monitor
	_, _, err = db.Client.From("monitors").Select("id", "exact", false).Eq("id", payload.MonitorID).Eq("user_id", userID).Single().Execute()
	if err != nil {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "forbidden monitor"})
	}

	spm := models.StatusPageMonitor{
		StatusPageID: id,
		MonitorID:    payload.MonitorID,
	}

	_, _, err = db.Client.From("status_page_monitors").Insert(spm, false, "", "", "exact").Execute()
	if err != nil {
		sentry.CaptureException(err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.SendStatus(fiber.StatusCreated)
}

func RemoveMonitorFromStatusPage(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	id := c.Params("id")
	monitorID := c.Params("monitorId")

	// Verify ownership of status page
	_, _, err := db.Client.From("status_pages").Select("id", "exact", false).Eq("id", id).Eq("user_id", userID).Single().Execute()
	if err != nil {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "forbidden"})
	}

	_, _, err = db.Client.From("status_page_monitors").Delete("", "exact").Eq("status_page_id", id).Eq("monitor_id", monitorID).Execute()
	if err != nil {
		sentry.CaptureException(err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.SendStatus(fiber.StatusNoContent)
}

type MonitorWithPing struct {
	models.Monitor
	LatestPing *models.Ping `json:"latest_ping"`
}

func GetStatusPage(c *fiber.Ctx) error {
	slug := c.Params("slug")

	var statusPage models.StatusPage
	data, _, err := db.Client.From("status_pages").Select("*", "exact", false).Eq("slug", slug).Single().Execute()
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "status page not found"})
	}
	
	_ = json.Unmarshal(data, &statusPage)

	if !statusPage.IsPublic {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "status page is private"})
	}

	// Fetch monitors for this status page
	var pageMonitors []struct {
		MonitorID string `json:"monitor_id"`
	}
	pmData, _, err := db.Client.From("status_page_monitors").Select("monitor_id", "exact", false).Eq("status_page_id", statusPage.ID).Execute()
	if err != nil {
		sentry.CaptureException(err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	_ = json.Unmarshal(pmData, &pageMonitors)

	monitorIDs := make([]string, len(pageMonitors))
	for i, pm := range pageMonitors {
		monitorIDs[i] = pm.MonitorID
	}

	var enrichedMonitors []MonitorWithPing

	if len(monitorIDs) > 0 {
		var monitors []models.Monitor
		mD, _, err := db.Client.From("monitors").Select("*", "exact", false).In("id", monitorIDs).Execute()
		if err != nil {
			sentry.CaptureException(err)
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
		}
		_ = json.Unmarshal(mD, &monitors)

		for _, m := range monitors {
			var pings []models.Ping
			pData, _, err := db.Client.From("pings").Select("*", "exact", false).Eq("monitor_id", m.ID).Order("checked_at", &postgrest.OrderOpts{Ascending: false}).Limit(1, "").Execute()
			if err == nil {
				_ = json.Unmarshal(pData, &pings)
			}

			enriched := MonitorWithPing{
				Monitor: m,
			}
			if len(pings) > 0 {
				enriched.LatestPing = &pings[0]
			}
			enrichedMonitors = append(enrichedMonitors, enriched)
		}
	} else {
		enrichedMonitors = []MonitorWithPing{}
	}

	return c.JSON(fiber.Map{
		"status_page": statusPage,
		"monitors":    enrichedMonitors,
	})
}

func GetAlertChannels(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	var channels []models.AlertChannel
	data, _, err := db.Client.From("alert_channels").Select("*", "exact", false).Eq("user_id", userID).Execute()
	if err != nil {
		sentry.CaptureException(err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	_ = json.Unmarshal(data, &channels)
	if channels == nil {
		channels = []models.AlertChannel{}
	}
	return c.JSON(channels)
}

func CreateAlertChannel(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	var channel models.AlertChannel
	if err := c.BodyParser(&channel); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	channel.UserID = userID

	data, _, err := db.Client.From("alert_channels").Insert(channel, false, "", "", "exact").Execute()
	if err != nil {
		sentry.CaptureException(err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	
	var created []models.AlertChannel
	if err := json.Unmarshal(data, &created); err == nil && len(created) > 0 {
		channel = created[0]
	}
	
	return c.Status(fiber.StatusCreated).JSON(channel)
}

func UpdateAlertChannel(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	id := c.Params("id")
	var updates map[string]interface{}
	if err := c.BodyParser(&updates); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	_, _, err := db.Client.From("alert_channels").Update(updates, "", "exact").Eq("id", id).Eq("user_id", userID).Execute()
	if err != nil {
		sentry.CaptureException(err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.SendStatus(fiber.StatusOK)
}

func DeleteAlertChannel(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	id := c.Params("id")

	_, _, err := db.Client.From("alert_channels").Delete("", "exact").Eq("id", id).Eq("user_id", userID).Execute()
	if err != nil {
		sentry.CaptureException(err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.SendStatus(fiber.StatusNoContent)
}

func AttachAlertChannelToMonitor(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	monitorID := c.Params("id")
	
	var payload struct {
		AlertChannelID string `json:"alert_channel_id"`
	}
	if err := c.BodyParser(&payload); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	// Verify ownership of monitor
	_, _, err := db.Client.From("monitors").Select("id", "exact", false).Eq("id", monitorID).Eq("user_id", userID).Single().Execute()
	if err != nil {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "forbidden monitor"})
	}
	
	// Verify ownership of alert channel
	_, _, err = db.Client.From("alert_channels").Select("id", "exact", false).Eq("id", payload.AlertChannelID).Eq("user_id", userID).Single().Execute()
	if err != nil {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "forbidden alert channel"})
	}

	mac := models.MonitorAlertChannel{
		MonitorID:      monitorID,
		AlertChannelID: payload.AlertChannelID,
	}

	_, _, err = db.Client.From("monitor_alert_channels").Insert(mac, false, "", "", "exact").Execute()
	if err != nil {
		sentry.CaptureException(err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.SendStatus(fiber.StatusCreated)
}

func DetachAlertChannelFromMonitor(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	monitorID := c.Params("id")
	channelID := c.Params("channelId")

	// Verify ownership of monitor
	_, _, err := db.Client.From("monitors").Select("id", "exact", false).Eq("id", monitorID).Eq("user_id", userID).Single().Execute()
	if err != nil {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "forbidden monitor"})
	}

	_, _, err = db.Client.From("monitor_alert_channels").Delete("", "exact").Eq("monitor_id", monitorID).Eq("alert_channel_id", channelID).Execute()
	if err != nil {
		sentry.CaptureException(err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.SendStatus(fiber.StatusNoContent)
}

func GetMonitorAlertChannels(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	monitorID := c.Params("id")

	// Verify ownership of monitor
	_, _, err := db.Client.From("monitors").Select("id", "exact", false).Eq("id", monitorID).Eq("user_id", userID).Single().Execute()
	if err != nil {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "forbidden monitor"})
	}

	var macs []models.MonitorAlertChannel
	data, _, err := db.Client.From("monitor_alert_channels").Select("*", "exact", false).Eq("monitor_id", monitorID).Execute()
	if err != nil {
		sentry.CaptureException(err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	_ = json.Unmarshal(data, &macs)

	if len(macs) == 0 {
		return c.JSON([]models.AlertChannel{})
	}

	channelIDs := make([]string, len(macs))
	for i, mac := range macs {
		channelIDs[i] = mac.AlertChannelID
	}

	var channels []models.AlertChannel
	cData, _, err := db.Client.From("alert_channels").Select("*", "exact", false).In("id", channelIDs).Execute()
	if err != nil {
		sentry.CaptureException(err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	_ = json.Unmarshal(cData, &channels)
	if channels == nil {
		channels = []models.AlertChannel{}
	}

	return c.JSON(channels)
}
