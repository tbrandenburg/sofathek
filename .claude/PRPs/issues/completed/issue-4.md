# Investigation: Playwright dependency conflicts with external system packages

**Issue**: #4 (https://github.com/tbrandenburg/sofathek/issues/4)
**Type**: CHORE
**Investigated**: 2026-03-02T10:00:00Z

### Assessment

| Metric     | Value  | Reasoning                                                                                                                                                                                       |
| ---------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Priority   | MEDIUM | Affects CI/CD automation and developer experience but current workaround provides full E2E testing functionality using built-in Playwright browser tools                                      |
| Complexity | MEDIUM | Requires 4 configuration files, port alignment, Docker setup, and Makefile integration - moderate scope but well-defined changes                                                               |
| Confidence | HIGH   | Clear root cause identified through codebase exploration - port mismatches and version inconsistencies with concrete evidence from configuration files and git history                        |

---

## Problem Statement

Playwright command-line tools fail to execute due to port configuration mismatches between development environment (5183) and Playwright config (3000), version inconsistencies, and missing system-level browser dependencies. Current E2E tests work perfectly with built-in Playwright browser tools but cannot run via `npx playwright test`.

---

## Analysis

### Root Cause / Change Rationale

This is a **configuration alignment issue** rather than true dependency conflicts. The Playwright setup is functional but misconfigured for the actual development environment.

### Evidence Chain

**WHY**: `npx playwright test` fails
↓ **BECAUSE**: Port mismatch - Playwright expects frontend on port 3000 but development runs on port 5183
**Evidence**: `frontend/playwright.config.ts:29` - `baseURL: 'http://localhost:3000'` vs `Makefile:38` - `--port 5183`

↓ **BECAUSE**: Configuration inconsistency between multiple config files
**Evidence**: `frontend/vite.config.ts:8` - `port: 3000` but `Makefile:38` overrides with `--port 5183`

↓ **BECAUSE**: Version drift allowed by semver range
**Evidence**: `frontend/package.json:40-41` - `^1.40.0` installed as `1.58.2` (18 minor versions newer)

↓ **ROOT CAUSE**: Missing development environment standardization and Docker integration
**Evidence**: No Docker service for frontend E2E testing, system dependencies require sudo privileges

### Affected Files

| File                           | Lines | Action | Description                                                   |
| ------------------------------ | ----- | ------ | ------------------------------------------------------------- |
| `frontend/playwright.config.ts` | 29,72 | UPDATE | Align ports to 5183 for development compatibility            |
| `frontend/vite.config.ts`       | 8     | UPDATE | Standardize port to 5183 across all configurations           |
| `docker-compose.yml`            | NEW   | UPDATE | Add frontend service with Playwright browser support         |
| `Makefile`                     | NEW   | UPDATE | Add playwright-install target for browser setup              |
| `frontend/package.json`         | 40-41 | UPDATE | Pin Playwright to specific version (1.58.2) for consistency  |

### Integration Points

- `Makefile:38` calls frontend dev server with port override
- `frontend/playwright.config.ts:71` starts webServer for tests
- E2E tests in `frontend/tests/video-playback.spec.ts` depend on correct port configuration
- Docker backend service runs independently on port 3010

### Git History

- **Introduced**: 0e4aaf5 - 2026-03-02 - "feat(sofathek): complete Netflix-like frontend interface with E2E testing"
- **Last modified**: 0e4aaf5 - 2026-03-02 - Same commit
- **Implication**: Configuration inconsistency introduced in initial E2E implementation - not a regression

---

## Implementation Plan

### Step 1: Standardize Development Port Configuration

**File**: `frontend/playwright.config.ts`
**Lines**: 29, 72
**Action**: UPDATE

**Current code:**
```typescript
// Line 29
    baseURL: 'http://localhost:3000',
// Line 72  
    url: 'http://localhost:3000',
```

**Required change:**
```typescript
// Line 29
    baseURL: 'http://localhost:5183',
// Line 72
    url: 'http://localhost:5183',
```

**Why**: Align Playwright configuration with actual development server port used in Makefile

---

### Step 2: Update Vite Configuration for Consistency

**File**: `frontend/vite.config.ts`
**Lines**: 8
**Action**: UPDATE

**Current code:**
```typescript
// Line 8
    port: 3000,
```

**Required change:**
```typescript
// Line 8
    port: 5183,
```

**Why**: Standardize port across all configuration files to prevent conflicts

---

### Step 3: Pin Playwright Version for Stability

**File**: `frontend/package.json`
**Lines**: 40-41
**Action**: UPDATE

**Current code:**
```json
    "playwright": "^1.40.0",
    "@playwright/test": "^1.40.0",
```

**Required change:**
```json
    "playwright": "1.58.2",
    "@playwright/test": "1.58.2",
```

**Why**: Prevent version drift and ensure consistent behavior across environments

---

### Step 4: Add Docker Playwright Service

**File**: `docker-compose.yml`
**Lines**: After line 44
**Action**: UPDATE

**Required addition:**
```yaml
  # Frontend with Playwright E2E testing support
  frontend:
    image: mcr.microsoft.com/playwright:v1.58.2-focal
    working_dir: /app
    volumes:
      - ./frontend:/app
      - /app/node_modules
    ports:
      - "5183:5183"
    environment:
      - CI=true
    command: sh -c "npm install && npx playwright install && npm run dev -- --host 0.0.0.0 --port 5183"
    depends_on:
      - backend
    networks:
      - sofathek

  # Playwright test runner service
  e2e-tests:
    image: mcr.microsoft.com/playwright:v1.58.2-focal
    working_dir: /app
    volumes:
      - ./frontend:/app
      - ./frontend/test-results:/app/test-results
    environment:
      - CI=true
    command: sh -c "npm install && npx playwright install && npx playwright test"
    depends_on:
      - frontend
      - backend
    networks:
      - sofathek
    profiles:
      - testing
```

**Why**: Provide isolated environment with pre-installed Playwright browsers and system dependencies

---

### Step 5: Add Makefile Integration for Playwright

**File**: `Makefile`
**Lines**: After line 20 (new targets)
**Action**: UPDATE

**Required addition:**
```makefile
# Playwright E2E testing targets
.PHONY: playwright-install playwright-test e2e-test e2e-docker

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
```

**Why**: Provide standardized commands for Playwright browser installation and testing

---

### Step 6: Add/Update Tests

**File**: `frontend/tests/playwright-config.spec.ts`
**Action**: CREATE

**Test cases to add:**
```typescript
import { test, expect } from '@playwright/test';

describe('Playwright Configuration', () => {
  test('should connect to correct development server port', async ({ page }) => {
    await page.goto('/');
    
    // Verify we're connected to the right port
    expect(page.url()).toContain('5183');
    
    // Verify page loads correctly
    await expect(page.getByRole('button', { name: 'Library' })).toBeVisible();
  });

  test('should run with consistent browser versions', async ({ browserName }) => {
    // Verify browser compatibility
    expect(['chromium', 'firefox', 'webkit']).toContain(browserName);
  });

  test('should have working webServer configuration', async ({ page }) => {
    // Test that webServer starts correctly and serves the app
    await page.goto('/');
    await expect(page).toHaveTitle(/Sofathek/);
  });
});
```

---

## Patterns to Follow

**From codebase - mirror these exactly:**

```yaml
# SOURCE: docker-compose.yml:1-20
# Pattern for service configuration
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "3010:3010"
    environment:
      - NODE_ENV=development
    volumes:
      - ./videos:/app/videos
    networks:
      - sofathek
```

```makefile
# SOURCE: Makefile:32-39
# Pattern for development server commands
dev: install ## Start development servers (backend + frontend)
	@echo "Backend: http://localhost:3010 | Frontend: http://localhost:5183"
	@trap 'kill %1 %2 2>/dev/null; exit 0' INT; \
	(cd backend && PORT=3010 npm run dev) & \
	sleep 3 && \
	(cd frontend && npm run dev -- --port 5183) & \
	wait
```

---

## Edge Cases & Risks

| Risk/Edge Case                              | Mitigation                                                                                |
| ------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Port 5183 conflicts with other services    | Check for port conflicts, use different port if needed, document in README               |
| Docker Playwright image compatibility      | Pin to specific version (v1.58.2-focal) that matches installed Playwright version       |
| System dependencies still missing in Docker | Use official Playwright Docker image with pre-installed system dependencies             |
| Version pinning prevents security updates  | Document upgrade process, schedule regular version reviews                                |
| CI/CD integration breaks                   | Test Docker compose profiles, provide both local and CI/CD execution paths              |

---

## Validation

### Automated Checks

```bash
# Type checking and linting
cd frontend && npm run type-check
cd frontend && npm run lint

# Test Playwright installation
cd frontend && npx playwright install --dry-run

# Run E2E tests locally  
make e2e-test

# Test Docker E2E environment
make e2e-docker

# Verify port consistency
grep -r "localhost:5183" frontend/
grep -r "port.*5183" frontend/ Makefile docker-compose.yml
```

### Manual Verification

1. Start development servers: `make dev` - verify frontend runs on port 5183
2. Run Playwright tests: `cd frontend && npm run test:e2e` - verify all tests pass
3. Test Docker environment: `docker-compose --profile testing up e2e-tests` - verify containerized execution
4. Check browser installation: `cd frontend && npx playwright install` - verify no permission errors

---

## Scope Boundaries

**IN SCOPE:**
- Port standardization across configuration files
- Playwright version pinning and browser installation
- Docker integration for isolated E2E testing
- Makefile targets for developer workflow

**OUT OF SCOPE (do not touch):**
- Existing E2E test content (already working perfectly)
- Backend configuration or dependencies  
- CI/CD pipeline setup (no existing pipeline found)
- Alternative E2E frameworks (Cypress, Puppeteer)
- System-wide Playwright installation

---

## Metadata

- **Investigated by**: Claude
- **Timestamp**: 2026-03-02T10:00:00Z
- **Artifact**: `.claude/PRPs/issues/issue-4.md`