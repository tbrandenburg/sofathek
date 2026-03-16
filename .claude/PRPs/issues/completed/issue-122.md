# Issue #122: Security Regression Fix - COMPLETED

**Issue**: #122 - 🚫 MERGE BLOCKER: PR #117 Targets Wrong Endpoint - Do Not Merge
**Type**: CRITICAL SECURITY BUG
**Completed**: 2026-03-16T12:05:00Z
**PR**: #125 - https://github.com/tbrandenburg/sofathek/pull/125

## Summary

Fixed critical security regression introduced by PR #117 which weakened path validation in the video streaming endpoint, allowing directory boundary attacks.

## Root Cause

PR #117 incorrectly modified the path validation logic from:
```typescript
// SECURE (Original)
if (!resolvedVideoPath.startsWith(allowedVideosDir + path.sep) && resolvedVideoPath !== allowedVideosDir)

// VULNERABLE (PR #117)
if (!resolvedVideoPath.startsWith(allowedVideosDir))
```

This change allowed attackers to access sibling directories (e.g., `/data/videos-backup/` when only `/data/videos/` should be allowed).

## Changes Made

| File | Change | Lines |
|------|--------|-------|
| `backend/src/routes/api.ts` | Restored secure path validation with `+ path.sep` | 110-112 |
| `backend/src/__tests__/integration/routes/api.test.ts` | Added security regression tests | 184-240 |

## Implementation Details

### Security Fix
- Restored the secure path boundary validation pattern
- Ensured cross-platform compatibility with `path.sep`
- Maintained consistency with other security validations in the codebase

### Test Coverage
- Added test for sibling directory attack prevention (returns 403)
- Added test for valid path acceptance (returns 404 for missing file, not 403)
- Used proper mocking to simulate directory boundary attack scenarios

## Validation Results

- ✅ Type check: Passed
- ✅ Unit tests: Passed (including new security tests)
- ✅ Lint: Passed
- ✅ Build validation: Passed
- ✅ Self-review: Approved

## Artifact Source

Investigation plan was provided in GitHub issue #122 comment by github-actions bot.

## Next Steps

- PR #125 ready for human review and immediate merge
- Critical security vulnerability resolved
- No further action required on issue #122