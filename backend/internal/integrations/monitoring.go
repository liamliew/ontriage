package integrations

import (
	"context"
	"log"
	"os"

	"github.com/getsentry/sentry-go"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp"
	"go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.17.0"
)

func InitMonitoring() func() {
	// Initialize Sentry
	sentryDSN := os.Getenv("SENTRY_DSN")
	if sentryDSN != "" {
		err := sentry.Init(sentry.ClientOptions{
			Dsn:              sentryDSN,
			TracesSampleRate: 1.0,
		})
		if err != nil {
			log.Fatalf("sentry.Init: %s", err)
		}
	}

	// Initialize SigNoz (OTEL)
	signozEndpoint := os.Getenv("SIGNOZ_OTLP_ENDPOINT")
	signozKey := os.Getenv("SIGNOZ_INGESTION_KEY")

	var shutdown func()
	if signozEndpoint != "" {
		ctx := context.Background()
		exporter, err := otlptracehttp.New(ctx,
			otlptracehttp.WithEndpoint(signozEndpoint),
			otlptracehttp.WithHeaders(map[string]string{
				"signoz-access-token": signozKey,
			}),
		)
		if err != nil {
			log.Fatalf("failed to create otel exporter: %v", err)
		}

		tp := sdktrace.NewTracerProvider(
			sdktrace.WithBatcher(exporter),
			sdktrace.WithResource(resource.NewWithAttributes(
				semconv.SchemaURL,
				semconv.ServiceNameKey.String("ontriage-backend"),
			)),
		)
		otel.SetTracerProvider(tp)
		shutdown = func() {
			tp.Shutdown(ctx)
		}
	}

	return func() {
		if shutdown != nil {
			shutdown()
		}
		sentry.Flush(2)
	}
}
