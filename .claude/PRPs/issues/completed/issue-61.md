# Investigation: Fix modal null-safety in VideoPlayer for missing file.name

**Issue**: #61 (https://github.com/tbrandenburg/sofathek/issues/61)
**Type**: BUG
**Investigated**: 2026-03-13T12:00:00Z
**Source Comment**: https://github.com/tbrandenburg/sofathek/issues/61#issuecomment-4058635261

---

## Problem Statement

`VideoPlayer` and modal rendering paths can crash when malformed runtime payloads omit `video.file` or `video.file.name`.

---

## Root Cause

Direct access to `video.file.*` values was not consistently guarded, despite runtime payloads potentially violating strict frontend types.

---

## Implementation Plan (from investigation comment)

1. Add defensive null checks in `frontend/src/components/VideoPlayer/VideoPlayer.tsx` for stream URL resolution and file metadata rendering.
2. Hide modal download link in `frontend/src/App.tsx` when `selectedVideo.file.name` is missing.
3. Add regression tests in `frontend/src/__tests__/VideoPlayer.test.tsx` for malformed payload handling and safe fallback rendering.

---

## Validation Commands

```bash
cd frontend
npm run test -- --run src/__tests__/VideoPlayer.test.tsx
npm run test -- --run src/__tests__/VideoCard.test.tsx
npm run type-check
npm run lint
```

---

## Scope

**In scope**
- Frontend null-safety guards in `VideoPlayer`
- Modal download-link guard in `App`
- Regression test coverage

**Out of scope**
- Backend API schema enforcement
- Frontend type-definition redesign
- Broader refactors outside issue #61
