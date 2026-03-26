# Sofathek - Family Media Center
# Essential development commands

.PHONY: help install build test lint clean dev start stop docker playwright-install playwright-test e2e-test e2e-docker clean-ports

# Port configuration (override via: make dev SOFATHEK_BACKEND_PORT=4000)
SOFATHEK_BACKEND_PORT ?= 3010
SOFATHEK_FRONTEND_PORT ?= 8010

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
	@echo "🔨 Building backend..."
	@cd backend && npm run build || (echo "❌ Backend build failed" && exit 1)
	@echo "🔨 Building frontend..."
	@cd frontend && npm run build || (echo "❌ Frontend build failed" && exit 1)
	@echo "✅ Build completed successfully"

# Playwright E2E testing targets
playwright-install: ## Install Playwright browsers and dependencies
	@echo "Installing Playwright browsers..."
	cd frontend && npx playwright install
	@echo "Playwright browsers installed successfully"

playwright-test: ## Run Playwright E2E tests locally
	@echo "Running E2E tests with Playwright..."
	cd frontend && npm run test:e2e

e2e-test: dev playwright-test ## Start dev servers and run E2E tests

e2e-docker: ## Run E2E tests in Docker with isolated browsers
	@echo "Running E2E tests in Docker environment..."
	docker-compose --profile testing run --rm e2e-tests

test: ## Run all tests
	@echo "🧪 Running tests..."
	@cd backend && npm test -- --passWithNoTests
	@cd frontend && npm test

lint: ## Check and fix code quality
	@echo "🔍 Linting..."
	@cd backend && npm run lint:fix
	@cd frontend && npm run lint:fix

type-check: ## Run TypeScript type checking
	@echo "🔍 Type checking..."
	@cd backend && npm run type-check
	@cd frontend && npm run type-check

clean-ports: ## Clean up processes on development ports
	@echo "🧹 Cleaning up ports $(SOFATHEK_BACKEND_PORT) and $(SOFATHEK_FRONTEND_PORT)..."
	@lsof -ti:$(SOFATHEK_BACKEND_PORT) 2>/dev/null | xargs -r kill -TERM 2>/dev/null || true
	@lsof -ti:$(SOFATHEK_FRONTEND_PORT) 2>/dev/null | xargs -r kill -TERM 2>/dev/null || true
	@sleep 1
	@lsof -ti:$(SOFATHEK_BACKEND_PORT) 2>/dev/null | xargs -r kill -KILL 2>/dev/null || true
	@lsof -ti:$(SOFATHEK_FRONTEND_PORT) 2>/dev/null | xargs -r kill -KILL 2>/dev/null || true
	@pkill -f "PORT=$(SOFATHEK_BACKEND_PORT)" 2>/dev/null || true
	@pkill -f "python3 -m http.server $(SOFATHEK_FRONTEND_PORT)" 2>/dev/null || true
	@pkill -f "vite.*--port $(SOFATHEK_FRONTEND_PORT)" 2>/dev/null || true

dev: ## Start development servers (backend:$(SOFATHEK_BACKEND_PORT), frontend:$(SOFATHEK_FRONTEND_PORT))
	@echo "🚀 Starting development servers..."
	@echo "Backend: http://localhost:$(SOFATHEK_BACKEND_PORT) | Frontend: http://localhost:$(SOFATHEK_FRONTEND_PORT)"
	@echo "🧹 Cleaning up any existing processes..."
	@lsof -ti:$(SOFATHEK_BACKEND_PORT) 2>/dev/null | xargs -r kill -TERM 2>/dev/null; lsof -ti:$(SOFATHEK_FRONTEND_PORT) 2>/dev/null | xargs -r kill -TERM 2>/dev/null; sleep 0.5; lsof -ti:$(SOFATHEK_BACKEND_PORT),$(SOFATHEK_FRONTEND_PORT) 2>/dev/null | xargs -r kill -KILL 2>/dev/null; pkill -f "PORT=$(SOFATHEK_BACKEND_PORT)\|vite.*--port $(SOFATHEK_FRONTEND_PORT)" 2>/dev/null || true
	@trap 'kill %1 %2 2>/dev/null; exit 0' INT; \
	(cd backend && SOFATHEK_BACKEND_PORT=$(SOFATHEK_BACKEND_PORT) npm run dev) & \
	sleep 3 && \
	(cd frontend && SOFATHEK_FRONTEND_PORT=$(SOFATHEK_FRONTEND_PORT) npm run dev -- --port $(SOFATHEK_FRONTEND_PORT)) & \
	wait

start: build ## Start production servers
	@echo "🚀 Starting production servers..."
	@echo "Backend: http://localhost:$(SOFATHEK_BACKEND_PORT) | Frontend: http://localhost:$(SOFATHEK_FRONTEND_PORT)"
	@echo "🧹 Cleaning up any existing processes..."
	@lsof -ti:$(SOFATHEK_BACKEND_PORT) 2>/dev/null | xargs -r kill -TERM 2>/dev/null; lsof -ti:$(SOFATHEK_FRONTEND_PORT) 2>/dev/null | xargs -r kill -TERM 2>/dev/null; sleep 0.5; lsof -ti:$(SOFATHEK_BACKEND_PORT),$(SOFATHEK_FRONTEND_PORT) 2>/dev/null | xargs -r kill -KILL 2>/dev/null; pkill -f "PORT=$(SOFATHEK_BACKEND_PORT)\|vite.*--port $(SOFATHEK_FRONTEND_PORT)" 2>/dev/null || true
	@echo "Starting backend..."
	@(cd backend && SOFATHEK_BACKEND_PORT=$(SOFATHEK_BACKEND_PORT) npm start) &
	@sleep 1 && ./scripts/wait-for-it.sh http://localhost:$(SOFATHEK_BACKEND_PORT)/health 30 || (echo "❌ Backend failed to start - check logs" && exit 1)
	@echo "✅ Backend started successfully"
	@echo "Starting frontend..."
	@(cd frontend && SOFATHEK_FRONTEND_PORT=$(SOFATHEK_FRONTEND_PORT) npm run preview -- --port $(SOFATHEK_FRONTEND_PORT) --host) &
	@sleep 1 && ./scripts/wait-for-it.sh http://localhost:$(SOFATHEK_FRONTEND_PORT) 10 || (echo "❌ Frontend failed to start" && exit 1)
	@echo "✅ Frontend started successfully"
	@echo ""
	@echo "🎉 All services started!"
	@echo "   Backend: http://localhost:$(SOFATHEK_BACKEND_PORT)"
	@echo "   Frontend: http://localhost:$(SOFATHEK_FRONTEND_PORT)"
	@echo ""
	@echo "Press Ctrl+C to stop all servers"
	@trap 'kill %1 %2 2>/dev/null; exit 0' INT; wait

stop: ## Stop all servers and clean up ports
	@echo "🛑 Stopping servers..."
	@bash -c 'for port in $(SOFATHEK_BACKEND_PORT) $(SOFATHEK_FRONTEND_PORT); do pids=$$(lsof -ti:$$port 2>/dev/null || true); if [ -n "$$pids" ]; then echo "  Killing processes on port $$port: $$pids"; kill -TERM $$pids 2>/dev/null || true; sleep 0.5; kill -KILL $$pids 2>/dev/null || true; fi; done'
	@pkill -f "PORT=$(SOFATHEK_BACKEND_PORT)" 2>/dev/null || true
	@pkill -f "vite.*--port $(SOFATHEK_FRONTEND_PORT)" 2>/dev/null || true
	@echo "✅ All servers stopped and ports cleaned up"

clean: ## Clean build artifacts
	@echo "🧹 Cleaning..."
	@rm -rf frontend/dist backend/dist

docker: ## Start with Docker Compose
	@echo "🐳 Starting Docker..."
	@docker-compose up --build