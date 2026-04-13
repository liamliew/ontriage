package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"

	sentryfiber "github.com/getsentry/sentry-go/fiber"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/joho/godotenv"
	"github.com/ontriage/backend/internal/api"
	"github.com/ontriage/backend/internal/auth"
	"github.com/ontriage/backend/internal/db"
	"github.com/ontriage/backend/internal/integrations"
	"github.com/ontriage/backend/internal/worker"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, relying on environment variables.")
	}

	// Initialize Monitoring (Sentry, SigNoz)
	shutdownMonitoring := integrations.InitMonitoring()
	defer shutdownMonitoring()

	// Initialize Supabase client
	if err := db.Init(); err != nil {
		log.Fatalf("Failed to initialize Supabase: %v", err)
	}

	// Initialize Auth (Clerk)
	if err := auth.Init(); err != nil {
		log.Fatalf("Failed to initialize Auth: %v", err)
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "7720"
	}

	app := fiber.New(fiber.Config{
		AppName: "OnTriage API",
	})

	// Middlewares
	app.Use(cors.New(cors.Config{
		AllowOrigins: "https://on.triage.lt",
		AllowMethods: "GET,POST,PATCH,DELETE,OPTIONS",
		AllowHeaders: "Authorization,Content-Type",
	}))
	
	// Initialize Sentry middleware
	app.Use(sentryfiber.New(sentryfiber.Options{
		Repanic:         true,
		WaitForDelivery: true,
	}))

	app.Use(logger.New())
	app.Use(recover.New())

	// Health check (Public)
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.SendStatus(fiber.StatusOK)
	})

	// Public status page
	app.Get("/status/:slug", api.GetStatusPage)

	// Protected routes
	apiRoutes := app.Group("/monitors", auth.Middleware())
	apiRoutes.Get("/", api.GetMonitors)
	apiRoutes.Post("/", api.CreateMonitor)
	apiRoutes.Patch("/:id", api.UpdateMonitor)
	apiRoutes.Delete("/:id", api.DeleteMonitor)
	apiRoutes.Get("/:id/pings", api.GetPings)
	apiRoutes.Get("/:id/incidents", api.GetIncidents)

	// Start Ping Worker (goroutine)
	w := worker.NewWorker()
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go w.Start(ctx)

	// Graceful shutdown
	go func() {
		if err := app.Listen(":" + port); err != nil {
			log.Panic(err)
		}
	}()

	// Signal handling
	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt, syscall.SIGTERM)

	<-c // Wait for signal
	log.Println("Shutting down...")
	cancel() // Stop worker
	_ = app.Shutdown()
}
