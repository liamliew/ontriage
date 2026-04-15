package auth

import (
	"context"
	"fmt"
	"os"
	"strings"

	"github.com/MicahParks/keyfunc/v3"
	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

var kf keyfunc.Keyfunc

func Init() error {
	jwksURL := os.Getenv("CLERK_JWKS_URL")
	if jwksURL == "" {
		return fmt.Errorf("CLERK_JWKS_URL is not set")
	}

	var err error
	kf, err = keyfunc.NewDefault([]string{jwksURL})
	if err != nil {
		return fmt.Errorf("failed to fetch JWKS: %w", err)
	}

	return nil
}

func ValidateToken(tokenString string) (string, error) {
	token, err := jwt.Parse(tokenString, kf.Keyfunc)
	if err != nil {
		return "", fmt.Errorf("invalid token: %v", err)
	}

	if !token.Valid {
		return "", fmt.Errorf("invalid token")
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return "", fmt.Errorf("invalid claims")
	}

	sub, ok := claims["sub"].(string)
	if !ok {
		return "", fmt.Errorf("missing sub claim")
	}

	return sub, nil
}

func Middleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "missing authorization header"})
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		sub, err := ValidateToken(tokenString)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": err.Error()})
		}

		// Store user ID in context
		c.Locals("userID", sub)

		return c.Next()
	}
}

func GetUserID(ctx context.Context) string {
	// For fiber context, we should use c.Locals
	// But if we pass it through to other layers, we might need a way to extract it.
	return "" // Placeholder
}
