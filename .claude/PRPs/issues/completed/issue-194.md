# Investigation: CRITICAL MERGE BLOCKER - Integration Tests Failing

**Issue**: #194 (https://github.com/tbrandenburg/sofathek/issues/194)
**Type**: BUG
**Investigated**: 2026-03-23T22:00:00Z

### Assessment

| Metric     | Value   | Reasoning                                                                                                    |
| ---------- | ------- | ------------------------------------------------------------------------------------------------------------ |
| Severity   | HIGH    | CI is broken, tests fail due to incorrect response format handling, blocks all future merges                   |
| Complexity | LOW     | Only 1 file needs a fix, single-line code change, clear error location in test file                           |
| Confidence | HIGH    | Root cause clearly identified via CI logs showing `data.message` is undefined in dev mode response format     |

---

## Problem Statement

Integration tests were re-enabled in CI (issue #186) but are now failing because the test code expects a production-mode error response format (`data.message`) while the backend runs in development mode and returns a dev-mode format (`data.error.message`).

## Root Cause Analysis (5 Whys)

**WHY**: Integration tests fail with `TypeError: Cannot read properties of undefined (reading 'toLowerCase')`
↓ BECAUSE: `data.message` is `undefined` in the test response
Evidence: `frontend/tests/youtube-download/integration.spec.ts:49` - `expect(data.message.toLowerCase()).toContain('rate')`

**WHY**: `data.message` is undefined
↓ BECAUSE: Backend runs in development mode (`npm run dev`) which returns error responses in dev format
Evidence: `.github/workflows/ci.yml:234` - `nohup npm run dev > ../backend.log 2>&1 &`

**WHY**: Dev mode returns a different error structure
↓ BECAUSE: The error handler distinguishes between dev and prod modes
Evidence: `backend/src/middleware/errorHandler.ts:45-56` - dev mode returns `{ status: 'error', error: { message: ..., ... } }`
Evidence: `backend/src/middleware/errorHandler.ts:62-83` - prod mode returns `{ status: 'error', message: ... }`

**WHY**: Test doesn't handle both error response formats
↓ BECAUSE: Test was written assuming production-mode response format
Evidence: `frontend/tests/youtube-download/integration.spec.ts:47-49` - expects `data.message` but should handle `data.error?.message`

**ROOT CAUSE**: Test code at `frontend/tests/youtube-download/integration.spec.ts:49,70` incorrectly accesses `data.message` when the development-mode response structure uses `data.error.message`
Evidence: Same lines 49 and 70 - `expect(data.message.toLowerCase()).toContain('rate')`

---

## Evidence Chain

```
SYMPTOM: Integration tests fail with TypeError: Cannot read properties of undefined
↓ BECAUSE: data.message is undefined in response
↓ BECAUSE: Backend runs in development mode (npm run dev)
↓ BECAUSE: Dev error response structure is { status: 'error', error: { message: ... } }
↓ ROOT CAUSE: Test accesses data.message but should access data.error?.message
```

---

## Affected Files

| File                                                                  | Lines  | Action | Description                                      |
| --------------------------------------------------------------------- | ------ | ------ | ------------------------------------------------ |
| `frontend/tests/youtube-download/integration.spec.ts`                  | 49, 70 | UPDATE | Fix error message access pattern                 |

### Integration Points

- `.github/workflows/ci.yml:234-239` - CI runs integration tests against backend in dev mode
- `backend/src/middleware/errorHandler.ts:45-56` - Dev mode error format
- `backend/src/middleware/errorHandler.ts:62-83` - Prod mode error format

### Git History

- **Last modified**: `46bb3cd` - "Fix: Update integration test expectations for non-existent URLs" (2026-03-23)
- **Implication**: The commit that re-enabled integration tests introduced this regression

---

## Implementation Plan

### Step 1: Fix error message access in integration tests

**File**: `frontend/tests/youtube-download/integration.spec.ts`
**Lines**: 49, 70
**Action**: UPDATE

**Current code (line 49):**

```typescript
expect(data.message.toLowerCase()).toContain('rate');
```

**Required change:**

```typescript
expect((data.error?.message ?? data.message ?? '').toLowerCase()).toContain('rate');
```

**Current code (line 70):**

```typescript
expect(data.message.toLowerCase()).toContain('rate');
```

**Required change:**

```typescript
expect((data.error?.message ?? data.message ?? '').toLowerCase()).toContain('rate');
```

**Why**: Both locations handle rate limit error responses but assume production format. The fix accesses `data.error?.message` first (dev mode), falling back to `data.message` (prod mode), with empty string fallback for safety.

---

## Patterns to Follow

**From codebase - error handling with optional chaining:**
```typescript
// SOURCE: backend/src/middleware/errorHandler.ts:48-49
expect((data.error?.message ?? data.message ?? '').toLowerCase()).toContain('rate');
```

---

## Edge Cases & Risks

| Risk/Edge Case              | Mitigation                                                    |
| --------------------------- | ------------------------------------------------------------- |
| Error response has neither  | Empty string fallback prevents TypeError                      |
| Response structure changes   | Optional chaining handles missing properties gracefully        |

---

## Validation

### Automated Checks

```bash
# Run integration tests locally
cd frontend && npx playwright test youtube-download/integration.spec.ts --project=chromium

# Run full test suite
make test

# Run linting
make lint
```

### Manual Verification

1. Check CI passes for integration tests
2. Verify 14+ tests pass with 0 failures

---

## Scope Boundaries

**IN SCOPE:**
- Fix `data.message` access in `integration.spec.ts` lines 49 and 70

**OUT OF SCOPE (do not touch):**
- Error handler response format changes
- CI workflow modifications
- Other test files

---

## Metadata

- **Investigated by**: GitHub Actions Bot
- **Timestamp**: 2026-03-23T22:00:00Z
- **Artifact**: `.claude/PRPs/issues/issue-194.md`
- **Status**: RESOLVED - Fix implemented in PR #199 (commit 3bf31ca)
- **Resolution**: Integration tests now properly handle both dev and prod error response formats