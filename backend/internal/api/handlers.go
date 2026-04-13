package api

import (
	"encoding/json"

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
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	_ = json.Unmarshal(data, &monitors)
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
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.SendStatus(fiber.StatusOK)
}

func DeleteMonitor(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	id := c.Params("id")

	_, _, err := db.Client.From("monitors").Delete("", "exact").Eq("id", id).Eq("user_id", userID).Execute()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.SendStatus(fiber.StatusNoContent)
}

func GetPings(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	id := c.Params("id")

	// Verify ownership
	_, _, err := db.Client.From("monitors").Select("id", "exact", false).Eq("id", id).Eq("user_id", userID).Single().Execute()
	if err != nil {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "forbidden"})
	}

	var pings []models.Ping
	data, _, err := db.Client.From("pings").Select("*", "exact", false).Eq("monitor_id", id).Order("checked_at", &postgrest.OrderOpts{Ascending: false}).Limit(100, "").Execute()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	_ = json.Unmarshal(data, &pings)
	return c.JSON(pings)
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
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	_ = json.Unmarshal(data, &incidents)
	return c.JSON(incidents)
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
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	_ = json.Unmarshal(pmData, &pageMonitors)

	monitorIDs := make([]string, len(pageMonitors))
	for i, pm := range pageMonitors {
		monitorIDs[i] = pm.MonitorID
	}

	var monitors []models.Monitor
	if len(monitorIDs) > 0 {
		mD, _, err := db.Client.From("monitors").Select("*", "exact", false).In("id", monitorIDs).Execute()
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
		}
		_ = json.Unmarshal(mD, &monitors)
	} else {
		monitors = []models.Monitor{}
	}

	return c.JSON(fiber.Map{
		"status_page": statusPage,
		"monitors":    monitors,
	})
}
