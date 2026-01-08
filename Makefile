# Sofathek Makefile
# Container-first development workflow automation

.PHONY: help setup install dev build test lint format clean docker-dev docker-prod docker-container-dev docker-test docker-build-prod docker-stop docker-clean health-check validate info

# Default target
.DEFAULT_GOAL := help

# Colors for terminal output
RED := \033[0;31m
GREEN := \033[0;32m
YELLOW := \033[0;33m
BLUE := \033[0;34m
NC := \033[0m # No Color

help: ## Display this help message
	@echo "$(BLUE)Sofathek - Self-hosted Family Media Center$(NC)"
	@echo "$(YELLOW)Available commands:$(NC)"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  $(GREEN)%-20s$(NC) %s\n", $$1, $$2}' $(MAKEFILE_LIST)

setup: ## Complete project setup (install dependencies and git hooks)
	@echo "$(BLUE)Setting up project...$(NC)"
	npm install
	npm run setup:husky
	@echo "$(GREEN)✅ Project setup complete!$(NC)"

install: ## Install all dependencies
	@echo "$(BLUE)Installing dependencies...$(NC)"
	npm install
	@echo "$(GREEN)✅ Dependencies installed!$(NC)"

dev: ## Start development servers (frontend + backend)
	@echo "$(BLUE)Starting development servers...$(NC)"
	@echo "$(YELLOW)Frontend: http://localhost:3005$(NC)"
	@echo "$(YELLOW)Backend:  http://localhost:3001$(NC)"
	npm run dev

build: ## Build for production
	@echo "$(BLUE)Building for production...$(NC)"
	npm run build
	@echo "$(GREEN)✅ Build complete!$(NC)"

test: ## Run all tests
	@echo "$(BLUE)Running tests...$(NC)"
	npm run test

test-watch: ## Run tests in watch mode
	@echo "$(BLUE)Running tests in watch mode...$(NC)"
	npm run test:watch

lint: ## Run linting
	@echo "$(BLUE)Running linter...$(NC)"
	npm run lint

lint-fix: ## Fix linting issues automatically
	@echo "$(BLUE)Fixing linting issues...$(NC)"
	npm run lint:fix

format: ## Format code with Prettier
	@echo "$(BLUE)Formatting code...$(NC)"
	npm run format

type-check: ## Run TypeScript type checking
	@echo "$(BLUE)Type checking...$(NC)"
	npm run type-check

clean: ## Clean build artifacts and dependencies
	@echo "$(BLUE)Cleaning build artifacts...$(NC)"
	rm -rf node_modules
	rm -rf frontend/node_modules
	rm -rf backend/node_modules
	rm -rf frontend/dist
	rm -rf backend/dist
	rm -rf shared/dist
	@echo "$(GREEN)✅ Cleaned!$(NC)"

docker-dev: ## Run development environment with Docker (legacy)
	@echo "$(BLUE)Starting Docker development environment...$(NC)"
	@echo "$(YELLOW)⚠️  Consider using 'make docker-container-dev' for container-first workflow$(NC)"
	docker-compose -f docker-compose.dev.yml up --build

docker-container-dev: ## Run container-first development (RECOMMENDED)
	@echo "$(BLUE)Starting container-first development environment...$(NC)"
	@echo "$(YELLOW)Frontend: http://localhost:3005$(NC)"
	@echo "$(YELLOW)Backend:  http://localhost:3001$(NC)"
	docker compose -f docker-compose.container-first.yml up backend-dev frontend-dev

docker-prod: ## Run production environment with Docker
	@echo "$(BLUE)Starting Docker production environment...$(NC)"
	docker-compose up --build

docker-build-prod: ## Build production Docker image
	@echo "$(BLUE)Building production Docker image...$(NC)"
	docker build -t sofathek-production --target production .
	@echo "$(GREEN)✅ Production image built: sofathek-production$(NC)"

docker-test: ## Run tests in containers
	@echo "$(BLUE)Running tests in container environment...$(NC)"
	docker compose -f docker-compose.container-first.yml --profile test up backend-test frontend-test

docker-stop: ## Stop Docker containers
	@echo "$(BLUE)Stopping Docker containers...$(NC)"
	-docker-compose down 2>/dev/null || true
	-docker-compose -f docker-compose.dev.yml down 2>/dev/null || true
	-docker compose -f docker-compose.container-first.yml down 2>/dev/null || true

docker-clean: ## Remove Docker containers and images
	@echo "$(BLUE)Cleaning Docker containers and images...$(NC)"
	docker-compose down --rmi all --volumes
	docker-compose -f docker-compose.dev.yml down --rmi all --volumes
	docker compose -f docker-compose.container-first.yml down --rmi all --volumes

health-check: ## Check if services are running
	@echo "$(BLUE)Checking service health...$(NC)"
	@curl -s http://localhost:3001/api/health > /dev/null && echo "$(GREEN)✅ Backend: OK$(NC)" || echo "$(RED)❌ Backend: DOWN$(NC)"
	@curl -s http://localhost:3005 > /dev/null && echo "$(GREEN)✅ Frontend: OK$(NC)" || echo "$(RED)❌ Frontend: DOWN$(NC)"

logs: ## Show development logs
	@echo "$(BLUE)Showing development logs...$(NC)"
	npm run dev 2>&1 | tee logs/dev.log

validate: ## Validate entire setup
	@echo "$(BLUE)Validating setup...$(NC)"
	@echo "$(YELLOW)1. Dependencies...$(NC)"
	@npm list --depth=0 > /dev/null && echo "$(GREEN)✅ Root dependencies OK$(NC)" || echo "$(RED)❌ Root dependencies issues$(NC)"
	@echo "$(YELLOW)2. TypeScript compilation...$(NC)"
	@npm run type-check && echo "$(GREEN)✅ TypeScript OK$(NC)" || echo "$(RED)❌ TypeScript issues$(NC)"
	@echo "$(YELLOW)3. Linting...$(NC)"
	@npm run lint && echo "$(GREEN)✅ Linting OK$(NC)" || echo "$(RED)❌ Linting issues$(NC)"
	@echo "$(YELLOW)4. Tests...$(NC)"
	@npm run test && echo "$(GREEN)✅ Tests OK$(NC)" || echo "$(RED)❌ Test failures$(NC)"
	@echo "$(GREEN)✅ Validation complete!$(NC)"

info: ## Show project information
	@echo "$(BLUE)Sofathek - Self-hosted Family Media Center$(NC)"
	@echo "$(YELLOW)React 19 + Express.js + TypeScript$(NC)"
	@echo ""
	@echo "$(YELLOW)Structure:$(NC)"
	@echo "  frontend/  - React 19 + TypeScript + Vite"
	@echo "  backend/   - Express.js + TypeScript + Node.js"
	@echo "  shared/    - Shared types and utilities"
	@echo ""
	@echo "$(YELLOW)Development Commands:$(NC)"
	@echo "  make setup                - Initial project setup"
	@echo "  make dev                  - Start development (native)"
	@echo "  make docker-container-dev - Start development (containers) ⭐"
	@echo "  make build                - Production build"
	@echo "  make test                 - Run tests"
	@echo "  make docker-test          - Run tests (containers)"
	@echo "  make validate             - Validate entire setup"
	@echo ""
	@echo "$(YELLOW)Container Commands:$(NC)"
	@echo "  make docker-container-dev - Container-first development"
	@echo "  make docker-build-prod    - Build production image"
	@echo "  make docker-test          - Test in containers"
	@echo "  make health-check         - Check service health"

# Create logs directory if it doesn't exist
create-logs-dir:
	@mkdir -p logs