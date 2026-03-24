# Investigation: META: Technical debt and deceptions from PR #185 emergency fix

**Issue**: #191 (https://github.com/tbrandenburg/sofathek/issues/191)
**Type**: CHORE
**Investigated**: 2026-03-23T00:00:00Z

### Assessment

| Metric     | Value                         | Reasoning                                                                                              |
| ---------- | ----------------------------- | ------------------------------------------------------------------------------------------------------ |
| Priority   | HIGH                          | Security implications from accepting any HTTP/HTTPS URL are untested and documented. Blocking 5 sub-issues |
| Complexity | MEDIUM                        | 6 files across frontend/backend require coordinated changes, but changes are isolated and well-understood |
| Confidence | HIGH                          | Clear root cause identified through code analysis; all integration points and workarounds documented      |

---

## Problem Statement

PR #185 introduced broader URL validation (accepting any HTTP/HTTPS URL instead of YouTube-only) but disabled integration tests and left CI with hardcoded workarounds. This creates a security gap where the frontend validates YouTube-only while the backend accepts any URL, and tests are disabled that would catch real-world failures.

---

## Implementation Plan

### Step 1: Re-enable Integration Tests

**File**: `backend/src/__tests__/integration/routes/youtube.integration.test.ts`
**Lines**: 113-115
**Action**: UPDATE

### Step 2: Clean Up CI Workflow

**File**: `.github/workflows/ci.yml`
**Lines**: 149, 174, 183, 263, 297, 395-396
**Action**: UPDATE - Remove sudo/nohup workarounds

### Step 3: Update README Documentation

**File**: `README.md`
**Lines**: 8
**Action**: UPDATE - Clarify broader URL support

---

## Validation

```bash
make lint
make test
cd backend && npm run test:integration
```