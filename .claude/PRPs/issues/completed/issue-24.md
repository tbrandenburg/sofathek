# Investigation: Turn off hard coverage limits

**Issue**: #24 (https://github.com/tbrandenburg/sofathek/issues/24)
**Type**: CHORE
**Investigated**: 2026-03-03T20:45:00Z

### Assessment

| Metric     | Value  | Reasoning                                                                                                          |
| ---------- | ------ | ------------------------------------------------------------------------------------------------------------------ |
| Priority   | HIGH   | Blocking fast development workflow - coverage limits are preventing commits/merges in early project phase         |
| Complexity | LOW    | Simple configuration changes across 4 files with clear patterns to follow                                         |
| Confidence | HIGH   | Clear evidence of coverage thresholds in configuration files, straightforward removal task with known file paths |

---

## Problem Statement

Hard coverage limits (40% thresholds) are impeding fast delivery during the early project phase by causing test failures when coverage drops below limits. The project needs to remove these enforcement mechanisms while keeping coverage collection for monitoring purposes and adding a comment about striving for >40% coverage.

---

## Analysis

### Root Cause / Change Rationale

WHY: Hard coverage limits are impeding fast delivery
↓ BECAUSE: Coverage thresholds are enforced at 40% for all metrics (branches, functions, lines, statements)
Evidence: `backend/jest.config.js:20-27` and `frontend/vitest.config.ts:30-37`

↓ BECAUSE: These thresholds were recently added consistently across the project
Evidence: Commit `37da4e0` (2026-03-02) - "Set coverage thresholds to 40% consistently across all metrics"

↓ ROOT CAUSE: Coverage enforcement configuration blocks development workflow
Evidence: 
- `backend/jest.config.js:20-27` - `coverageThreshold` object with 40% limits
- `backend/package.json:15` - `test:coverage` script with hardcoded threshold parameters
- `frontend/vitest.config.ts:30-37` - `thresholds.global` with 40% limits

### Evidence Chain

WHY: Coverage limits impede fast delivery
↓ BECAUSE: Tests fail when coverage drops below 40%
Evidence: `backend/jest.config.js:20-27` - Coverage thresholds enforce 40% minimums

↓ BECAUSE: Both Jest and Vitest are configured with hard limits
Evidence: `frontend/vitest.config.ts:30-37` - Vitest thresholds configuration

↓ ROOT CAUSE: Configuration enforces coverage minimums that block development
Evidence: Recent commit 37da4e0 added these limits systematically across the project

### Affected Files

| File                         | Lines  | Action | Description                                  |
| ---------------------------- | ------ | ------ | -------------------------------------------- |
| `backend/jest.config.js`     | 20-27  | UPDATE | Remove coverageThreshold configuration       |
| `backend/package.json`       | 15     | UPDATE | Remove threshold parameters from test script |
| `frontend/vitest.config.ts`  | 30-37  | UPDATE | Remove thresholds configuration              |
| `frontend/package.json`      | 15     | UPDATE | Add coverage goal comment                    |

### Integration Points

- `make test` command calls workspace test commands
- `.husky/pre-commit` runs `npm test` which may trigger coverage checks
- CI pipeline at `.github/workflows/ci.yml:118-140` collects coverage (already non-blocking)
- Root `package.json:17` has `test:coverage` script that calls workspace commands

### Git History

- **Introduced**: 37da4e0 - 2026-03-02 - "chore: Set coverage thresholds to 40% consistently across all metrics"
- **Last modified**: 37da4e0 - 2026-03-02
- **Implication**: Recent addition for consistency, now needs removal for development velocity

---

## Implementation Plan

### Step 1: Remove Backend Coverage Thresholds

**File**: `backend/jest.config.js`
**Lines**: 20-27
**Action**: UPDATE

**Current code:**

```javascript
// Lines 20-27
coverageThreshold: {
  global: {
    branches: 40,
    functions: 40,
    lines: 40,
    statements: 40
  }
}
```

**Required change:**

```javascript
// Remove entire coverageThreshold configuration
// Coverage will still be collected but not enforced
```

**Why**: Removes hard enforcement while keeping coverage collection active

---

### Step 2: Update Backend Test Coverage Script

**File**: `backend/package.json`
**Lines**: 15
**Action**: UPDATE

**Current code:**

```json
"test:coverage": "jest --coverage --coverageThreshold='{\"global\":{\"branches\":40,\"functions\":40,\"lines\":40,\"statements\":40}}'"
```

**Required change:**

```json
"test:coverage": "jest --coverage"
```

**Why**: Remove command-line threshold enforcement, keep coverage collection

---

### Step 3: Remove Frontend Coverage Thresholds

**File**: `frontend/vitest.config.ts`
**Lines**: 30-37
**Action**: UPDATE

**Current code:**

```javascript
// Lines 30-37
thresholds: {
  global: {
    branches: 40,
    functions: 40,
    lines: 40,
    statements: 40
  }
}
```

**Required change:**

```javascript
// Remove thresholds configuration from coverage config
// Keep all other coverage settings intact
```

**Why**: Remove Vitest threshold enforcement while maintaining coverage reporting

---

### Step 4: Add Coverage Goal Comment

**File**: `frontend/package.json` (or `backend/package.json`)
**Lines**: Near test scripts
**Action**: UPDATE

**Add comment:**

```json
{
  "scripts": {
    "_comment": "Coverage goal: Strive for >40% coverage without hard limits during early development",
    "test:coverage": "vitest run --coverage"
  }
}
```

**Why**: Documents the coverage aspiration as requested in the issue

---

## Patterns to Follow

**From codebase - mirror these exactly:**

```javascript
// SOURCE: backend/jest.config.js:13-19
// Pattern for Jest coverage collection without thresholds
collectCoverageFrom: [
  'src/**/*.ts',
  '!src/**/*.d.ts',
  '!src/test-*.ts', // Exclude manual test files
],
coverageDirectory: 'coverage',
coverageReporters: ['text', 'lcov', 'html']
```

```javascript
// SOURCE: frontend/vitest.config.ts:15-29
// Pattern for Vitest coverage collection without thresholds
coverage: {
  provider: 'v8',
  reporter: ['text', 'json', 'html'],
  exclude: [
    'node_modules/', 'tests/', 'src/__tests__/',
    '**/*.d.ts', '**/*.config.*', '**/coverage/',
    '**/dist/', '**/.{idea,git,cache,output,temp}/',
    '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*'
  ],
  include: ['src/**/*.{ts,tsx}']
}
```

---

## Edge Cases & Risks

| Risk/Edge Case                           | Mitigation                                                           |
| ---------------------------------------- | -------------------------------------------------------------------- |
| CI pipeline might still enforce coverage | Verify CI config - already uses continue-on-error for coverage      |
| Pre-commit hooks might fail              | Test git hooks after changes to ensure they don't block commits     |
| Coverage reporting breaks                | Keep all reporter and collection settings, only remove thresholds    |
| Team loses coverage visibility           | Coverage is still collected and reported, just not enforced         |

---

## Validation

### Automated Checks

```bash
# Test that coverage collection still works without enforcement
npm run test:coverage --workspace=backend
npm run test:coverage --workspace=frontend

# Verify regular tests still pass
make test

# Check that git hooks don't block commits
git add . && git commit --dry-run
```

### Manual Verification

1. Run coverage commands and verify they complete successfully even with low coverage
2. Check coverage reports are still generated in `backend/coverage/` and `frontend/coverage/`
3. Verify pre-commit hooks don't block commits due to coverage failures
4. Confirm CI pipeline continues to collect coverage as artifacts

---

## Scope Boundaries

**IN SCOPE:**

- Remove hard coverage thresholds from Jest and Vitest configurations
- Remove threshold enforcement from package.json test scripts  
- Add aspirational coverage comment as requested
- Ensure coverage collection and reporting continues to work

**OUT OF SCOPE (do not touch):**

- CI/CD coverage collection (already non-blocking)
- Coverage reporter configurations
- Coverage collection settings and exclusions
- Test file patterns or test execution
- Coverage artifact uploading in CI

---

## Metadata

- **Investigated by**: Claude
- **Timestamp**: 2026-03-03T20:45:00Z
- **Artifact**: `.claude/PRPs/issues/issue-24.md`