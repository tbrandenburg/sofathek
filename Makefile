# Sofathek - Family Media Center
# Essential development commands

.PHONY: help install build test lint clean dev start stop docker

# Default target
help: ## Show available commands
	@echo "Sofathek Development Commands"
	@echo "============================="
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

install: ## Install all dependencies
	@echo "📦 Installing dependencies..."
	@cd frontend && npm install
	@cd backend && npm install

build: ## Build frontend and backend
	@echo "🔨 Building..."
	@cd backend && npm run build
	@cd frontend && npm run build

test: ## Run all tests
	@echo "🧪 Running tests..."
	@cd backend && npm test
	@cd frontend && npm test

lint: ## Check and fix code quality
	@echo "🔍 Linting..."
	@cd backend && npm run lint:fix
	@cd frontend && npm run lint:fix

dev: ## Start development servers (backend:3010, frontend:5183)
	@echo "🚀 Starting development servers..."
	@echo "Backend: http://localhost:3010 | Frontend: http://localhost:5183"
	@trap 'kill %1 %2 2>/dev/null; exit 0' INT; \
	(cd backend && PORT=3010 npm run dev) & \
	sleep 3 && \
	(cd frontend && npm run dev -- --port 5183) & \
	wait

start: build ## Start production servers
	@echo "🚀 Starting production servers..."
	@trap 'kill %1 %2 2>/dev/null; exit 0' INT; \
	(cd backend && PORT=3010 npm start) & \
	sleep 3 && \
	(cd frontend && python3 -m http.server 5183 --directory dist) & \
	wait

stop: ## Stop all servers
	@echo "🛑 Stopping servers..."
	@pkill -f "PORT=3010" || true
	@pkill -f "python3 -m http.server 5183" || true
	@pkill -f "vite.*--port 5183" || true

clean: ## Clean build artifacts
	@echo "🧹 Cleaning..."
	@rm -rf frontend/dist backend/dist

docker: ## Start with Docker Compose
	@echo "🐳 Starting Docker..."
	@docker-compose up --build