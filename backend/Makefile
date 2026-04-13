.PHONY: build run dev clean

BINARY_NAME=bin/ontriage

build:
	@echo "Building binary..."
	@mkdir -p bin
	@go build -o $(BINARY_NAME) cmd/api/main.go

run: build
	@echo "Running binary..."
	@./$(BINARY_NAME)

dev:
	@echo "Starting development mode..."
	@go run cmd/api/main.go

clean:
	@echo "Cleaning up..."
	@rm -rf bin
