# Agent Instructions

## Guidelines

* Never bypass issues - instead do one step back, make a root-cause-analysis with asking 5xWhy
* Be eager on finishing and solving tasks instead of skipping them - if needed change strategy and try again
* Never leave failing tests
* Use timeouts for potentially endless commands
* Boyscout rule: Always leave the codebase cleaner than it was before - also outside of current feature scope
* Keep it simple - do not overengineer - instead you get awarded for simple and smart solutions
* Avoid writing own code - but make heavy use of present libraries - concentrate on glue code
* Do not repeat yourself
* Follow SOLID principles

* Keep README.md updated after feature increments

## Development Workflow

### Essential Make Commands

Use these standardized commands for all development tasks:

```bash
make install     # Install all dependencies (frontend + backend)
make dev         # Start development servers (backend:3010, frontend:5183)
make test        # Run all tests (unit + integration)
make lint        # Check and fix code quality issues
make build       # Build frontend and backend for production
make start       # Start production servers
make clean       # Clean build artifacts
make stop        # Stop all running servers
make docker      # Start with Docker Compose
make help        # Show all available commands
```

**Key Points:**
- Always use `make dev` for development - it handles both backend and frontend
- Run `make lint` and `make test` before committing
- Use `make install` for initial setup or after dependency changes
- Backend runs on port 3010, frontend on port 5183 (safe ports)
- All commands are designed to be safe and non-destructive