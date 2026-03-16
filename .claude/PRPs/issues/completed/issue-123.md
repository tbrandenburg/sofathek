# Investigation: 🔐 CRITICAL: Thumbnail Endpoint Vulnerability Remains Unfixed

**Issue**: #123 (https://github.com/tbrandenburg/sofathek/issues/123)
**Type**: BUG
**Investigated**: 2026-03-16T12:30:00Z

### Assessment

| Metric     | Value      | Reasoning                                                                                              |
| ---------- | ---------- | ------------------------------------------------------------------------------------------------------- |
| Severity   | CRITICAL   | Active directory traversal vulnerability allows unauthorized file system access in production         |
| Complexity | LOW        | Single file (api.ts), only 2 lines need change, pattern already exists in streaming endpoint         |
| Confidence | HIGH       | Clear root cause identified, video streaming endpoint has correct pattern to mirror, evidence-based   |

---

## Problem Statement

The thumbnail endpoint at `/api/thumbnails/:filename` has a directory traversal vulnerability. The path validation at `backend/src/routes/api.ts:208-209` is missing the `+ path.sep` check that exists in the video streaming endpoint. This allows attackers to potentially access files outside the intended thumbnails directory using path traversal techniques.

---

## Analysis

### Root Cause / Change Rationale

The video streaming endpoint (fixed in PR #116/117) correctly validates path boundaries using `+ path.sep`:
```typescript
// backend/src/routes/api.ts:93
if (!resolvedVideoPath.startsWith(allowedVideosDir + path.sep) && resolvedVideoPath !== allowedVideosDir)
```

However, the thumbnail endpoint implementation at lines 208-209 omits this critical check:
```typescript
const isInVideosDir = resolvedVideosPath.startsWith(allowedVideosDir);  // MISSING: + path.sep
const isInTempDir = resolvedTempPath.startsWith(allowedTempDir);        // MISSING: + path.sep
```

Without `+ path.sep`, a malicious path like `/home/user/videosxxx` would incorrectly match because `startsWith()` matches prefixes, not directory boundaries.

### Evidence Chain

WHY: Directory traversal attacks can access files outside thumbnail directories
↓ BECAUSE: Path validation doesn't enforce strict directory boundaries
Evidence: `backend/src/routes/api.ts:208-209` - `startsWith(allowedVideosDir)` without `+ path.sep`

↓ BECAUSE: PR #116/117 only fixed the video streaming endpoint, not the thumbnail endpoint
Evidence: Git blame shows both lines added in commit fc4706a (2026-03-16)

↓ ROOT CAUSE: Missing `+ path.sep` check in thumbnail endpoint path validation
Evidence: Video streaming endpoint at line 93 shows correct pattern: `startsWith(allowedVideosDir + path.sep)`

### Affected Files

| File                              | Lines     | Action | Description                    |
| --------------------------------- | --------- | ------ | ------------------------------ |
| `backend/src/routes/api.ts`        | 208-209   | UPDATE | Add `+ path.sep` path boundary check |

### Integration Points

- `backend/src/routes/api.ts:150-267` - Thumbnail endpoint handler
- `backend/src/routes/api.ts:59-147` - Video streaming endpoint (reference pattern)
- `backend/src/__tests__/integration/routes/thumbnails.test.ts` - Security tests (lines 245-285 already exist)

### Git History

- **Introduced**: fc4706a - 2026-03-16 - "Merge pull request #116" (PR #117)
- **Last modified**: fc4706a - 2026-03-16
- **Imgression**: The fix for issue #111 incorrectly targeted only the streaming endpoint, leaving thumbnail endpoint vulnerable

---

## Implementation Plan

### Step 1: Fix Path Boundary Validation

**File**: `backend/src/routes/api.ts`
**Lines**: 208-209
**Action**: UPDATE

**Current code:**

```typescript
// Lines 208-209
const isInVideosDir = resolvedVideosPath.startsWith(allowedVideosDir);
const isInTempDir = resolvedTempPath.startsWith(allowedTempDir);
```

**Required change:**

```typescript
// Lines 208-209
const isInVideosDir = resolvedVideosPath.startsWith(allowedVideosDir + path.sep) || resolvedVideosPath === allowedVideosDir;
const isInTempDir = resolvedTempPath.startsWith(allowedTempDir + path.sep) || resolvedTempPath === allowedTempDir;
```

**Why**: This matches the exact pattern used in the video streaming endpoint at line 93, adding proper directory boundary validation with `+ path.sep` and allowing exact directory match with `|| resolvedPath === allowedDir`.

---

### Step 2: Verify Existing Security Tests

**File**: `backend/src/__tests__/integration/routes/thumbnails.test.ts`
**Action**: VERIFY (already exists)

The test file already contains security tests at lines 245-285:
- Directory traversal with `..` 
- Absolute path attempts
- URL-encoded traversal attempts

Run tests to confirm they pass after the fix:
```bash
cd backend && npm test -- --testPathPattern=thumbnails
```

---

## Patterns to Follow

**From codebase - video streaming endpoint (lines 91-95):**

```typescript
// backend/src/routes/api.ts:91-95
const resolvedVideoPath = path.resolve(videoPath);
const allowedVideosDir = path.resolve(videosDirectory);
if (!resolvedVideoPath.startsWith(allowedVideosDir + path.sep) && resolvedVideoPath !== allowedVideosDir) {
  throw new AppError('Invalid path', 403);
}
```

This is the exact pattern to mirror for the thumbnail endpoint fix.

---

## Edge Cases & Risks

| Risk/Edge Case        | Mitigation                                                                 |
| --------------------- | -------------------------------------------------------------------------- |
| Exact directory match | Added `|| resolvedPath === allowedDir` to allow serving from root dir     |
| Cross-platform        | Uses `path.sep` for OS-agnostic path separator                            |
| Symlink attacks       | `path.resolve()` follows symlinks, so resolved path check prevents these  |

---

## Validation

### Automated Checks

```bash
# Backend tests
cd backend && npm test -- --testPathPattern=thumbnails

# Lint check
cd backend && npm run lint

# Type check  
cd backend && npm run type-check
```

### Manual Verification

1. Test with path traversal attempt: `/api/thumbnails/../../../etc/passwd.jpg` - should return 403
2. Test with encoded traversal: `/api/thumbnails/%2e%2e%2f%2e%2e%2fetc%2fpasswd.jpg` - should return 400
3. Test legitimate thumbnail: `/api/thumbnails/valid-thumbnail.jpg` - should return 200 or 404 (file not found is OK)

---

## Scope Boundaries

**IN SCOPE:**

- Fix path boundary validation in thumbnail endpoint (lines 208-209)

**OUT OF SCOPE (do not touch):**

- Video streaming endpoint (already fixed)
- Other file-serving endpoints
- Adding new security tests (already exist)
- Frontend code

---

## Metadata

- **Investigated by**: GHAR
- **Timestamp**: 2026-03-16T12:30:00Z
- **Artifact**: `.ghar/issues/issue-123.md`