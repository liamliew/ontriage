package api

import (
	"github.com/gofiber/fiber/v2"
	"github.com/ontriage/backend/internal/db"
	"github.com/ontriage/backend/internal/models"
)

func GetMonitors(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	var monitors []models.Monitor
	err := db.Client.DB.From("monitors").Select("*").Eq("user_id", userID).Execute(&monitors)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
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

	_, _, err := db.Client.DB.From("monitors").Insert(monitor).Execute(&monitor)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
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

	_, _, err := db.Client.DB.From("monitors").Update(updates).Eq("id", id).Eq("user_id", userID).Execute(nil)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.SendStatus(fiber.StatusOK)
}

func DeleteMonitor(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	id := c.Params("id")

	_, _, err := db.Client.DB.From("monitors").Delete().Eq("id", id).Eq("user_id", userID).Execute(nil)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.SendStatus(fiber.StatusNoContent)
}

func GetPings(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	id := c.Params("id")

	// Verify ownership
	var monitor models.Monitor
	err := db.Client.DB.From("monitors").Select("id").Eq("id", id).Eq("user_id", userID).Single().Execute(&monitor)
	if err != nil {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "forbidden"})
	}

	var pings []models.Ping
	err = db.Client.DB.From("pings").Select("*").Eq("monitor_id", id).Order("checked_at", &db.OrderOptions{Ascending: false}).Limit(100).Execute(&pings)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(pings)
}

func GetIncidents(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	id := c.Params("id")

	// Verify ownership
	var monitor models.Monitor
	err := db.Client.DB.From("monitors").Select("id").Eq("id", id).Eq("user_id", userID).Single().Execute(&monitor)
	if err != nil {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "forbidden"})
	}

	var incidents []models.Incident
	err = db.Client.DB.From("incidents").Select("*").Eq("monitor_id", id).Order("started_at", &db.OrderOptions{Ascending: false}).Execute(&incidents)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(incidents)
}

func GetStatusPage(c *fiber.Ctx) error {
	slug := c.Params("slug")

	var statusPage models.StatusPage
	err := db.Client.DB.From("status_pages").Select("*").Eq("slug", slug).Single().Execute(&statusPage)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "status page not found"})
	}

	if !statusPage.IsPublic {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "status page is private"})
	}

	// Fetch monitors for this status page
	var pageMonitors []struct {
		MonitorID string `json:"monitor_id"`
	}
	err = db.Client.DB.From("status_page_monitors").Select("monitor_id").Eq("status_page_id", statusPage.ID).Execute(&pageMonitors)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	monitorIDs := make([]string, len(pageMonitors))
	for i, pm := range pageMonitors {
		monitorIDs[i] = pm.MonitorID
	}

	var monitors []models.Monitor
	err = db.Client.DB.From("monitors").Select("*").In("id", monitorIDs).Execute(&monitors)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"status_page": statusPage,
		"monitors":    monitors,
	})
}
