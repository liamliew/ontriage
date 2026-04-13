package db

import (
	"os"

	"github.com/supabase-community/supabase-go"
)

var Client *supabase.Client

func Init() error {
	supabaseURL := os.Getenv("SUPABASE_URL")
	supabaseKey := os.Getenv("SUPABASE_SERVICE_ROLE_KEY")

	client, err := supabase.NewClient(supabaseURL, supabaseKey, &supabase.ClientOptions{})
	if err != nil {
		return err
	}

	Client = client
	return nil
}
