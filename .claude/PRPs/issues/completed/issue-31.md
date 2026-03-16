# Investigation: Add a video download feature

**Issue**: #31 (https://github.com/tbrandenburg/sofathek/issues/31)
**Type**: ENHANCEMENT
**Investigated**: 2026-03-08T18:45:00.000Z

### Assessment

| Metric     | Value                         | Reasoning                                                                |
| ---------- | ----------------------------- | ------------------------------------------------------------------------ |
| Priority   | MEDIUM                        | Nice-to-have feature, no workaround exists but users can still play videos |
| Complexity | LOW                           | Single location change in App.tsx, uses existing streaming URL function |
| Confidence | HIGH                          | Clear implementation path, existing patterns to follow, no architectural changes needed |

---

## Problem Statement

Users want to download videos directly from the modal video player dialog. Currently, videos can only be streamed/played in the browser. The feature request asks for a download button in the modal to allow downloading videos via HTTP to local devices.

---

## Analysis

### Root Cause / Change Rationale

This is an enhancement, not a bug. The video streaming infrastructure already exists:
- Backend provides streaming endpoint at `/api/stream/{filename}` that serves full files
- Frontend has `getVideoStreamUrl()` function to generate URLs
- VideoPlayer already has a fallback download link inside `<video>` tag (lines 134-137 in VideoPlayer.tsx)

The enhancement simply requires exposing this download functionality more prominently via a button in the modal UI.

### Evidence Chain

The streaming URL is available via:
- `frontend/src/services/api.ts:82-84` - `getVideoStreamUrl(filename)` function
- `frontend/src/components/VideoPlayer/VideoPlayer.tsx:81` - Uses the function for the video src
- `frontend/src/components/VideoPlayer/VideoPlayer.tsx:136` - Already has fallback download link inside video tag

Backend serves files correctly:
- `backend/src/routes/api.ts:51-124` - Streaming endpoint handles both Range requests (streaming) and full file delivery

### Affected Files

| File                              | Lines       | Action | Description                          |
| --------------------------------- | ----------- | ------ | ------------------------------------ |
| `frontend/src/App.tsx`            | 82-88       | UPDATE | Add download button next to close    |
| `frontend/src/components/VideoPlayer/VideoPlayer.tsx` | 81-137 | UPDATE | Optional: expose streamingUrl or add download button here |

### Integration Points

- Uses existing `getVideoStreamUrl()` from `frontend/src/services/api.ts`
- Modal structure in `frontend/src/App.tsx` (lines 74-101)
- VideoPlayer component receives `video` prop with `video.file.name`

### Git History

- Cannot determine exact commit without repo access
- This is a new feature request, not a regression

---

## Implementation Plan

### Step 1: Add download button to modal

**File**: `frontend/src/App.tsx`
**Lines**: 82-88
**Action**: UPDATE

**Current code:**

```tsx
<button 
  className="absolute top-4 right-4 z-10 text-white hover:text-gray-300 text-2xl font-bold"
  onClick={handleClosePlayer}
  aria-label="Close video player"
>
  ✕
</button>
```

**Required change:**

```tsx
<div className="absolute top-4 right-4 z-10 flex gap-2">
  <a
    href={`${window.location.origin}/api/stream/${encodeURIComponent(selectedVideo.file.name)}`}
    download={selectedVideo.file.name}
    className="text-white hover:text-gray-300 text-xl p-2"
    aria-label="Download video"
    title="Download video"
  >
    ↓
  </a>
  <button 
    className="text-white hover:text-gray-300 text-2xl font-bold"
    onClick={handleClosePlayer}
    aria-label="Close video player"
  >
    ✕
  </button>
</div>
```

**Why**: Adds a download button alongside the close button in the modal header. Uses the existing streaming endpoint with download attribute. Note: Using window.location.origin to get the full URL since api.ts uses a relative path that assumes localhost:3010 in dev.

---

### Step 2: Update import for API_BASE_URL

**File**: `frontend/src/App.tsx`
**Lines**: 1-10 (imports)
**Action**: UPDATE

**Current code:**

```tsx
import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from './components/Layout/Layout';
import { ContentContainer } from './components/ContentContainer/ContentContainer';
import { VideoGrid } from './components/VideoGrid/VideoGrid';
import { VideoPlayer } from './components/VideoPlayer/VideoPlayer';
```

**Required change:**

```tsx
import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from './components/Layout/Layout';
import { ContentContainer } from './components/ContentContainer/ContentContainer';
import { VideoGrid } from './components/VideoGrid/VideoGrid';
import { VideoPlayer } from './components/VideoPlayer/VideoPlayer';
import { getVideoStreamUrl } from './services/api';
```

**Why**: Need to import getVideoStreamUrl to generate correct streaming URL

---

### Step 3: Use getVideoStreamUrl for download link

**File**: `frontend/src/App.tsx`
**Lines**: 82-88 (from Step 1)
**Action**: UPDATE

**Required change (revised Step 1):**

```tsx
<div className="absolute top-4 right-4 z-10 flex gap-2">
  <a
    href={getVideoStreamUrl(selectedVideo.file.name)}
    download={selectedVideo.file.name}
    className="text-white hover:text-gray-300 text-xl p-2"
    aria-label="Download video"
    title="Download video"
  >
    ↓
  </a>
  <button 
    className="text-white hover:text-gray-300 text-2xl font-bold"
    onClick={handleClosePlayer}
    aria-label="Close video player"
  >
    ✕
  </button>
</div>
```

**Why**: Use the existing helper function for consistency and proper URL encoding

---

## Patterns to Follow

**From VideoPlayer.tsx:134-137 - Existing download fallback pattern:**

```tsx
<p>
  Your browser does not support the video tag. 
  <a href={streamingUrl} download>Download the video</a> instead.
</p>
```

This shows the `download` attribute works on anchor tags with streaming URLs.

**From App.tsx:82-88 - Modal button styling:**

```tsx
<button 
  className="absolute top-4 right-4 z-10 text-white hover:text-gray-300 text-2xl font-bold"
  onClick={handleClosePlayer}
  aria-label="Close video player"
>
  ✕
</button>
```

Use similar styling for the download button (white text, hover effect, positioned absolutely).

---

## Edge Cases & Risks

| Risk/Edge Case | Mitigation      |
| -------------- | --------------- |
| CORS issues with download | The streaming endpoint is same-origin, so download attribute should work |
| Large video files | Streaming endpoint already handles large files; browser will handle download |
| Special characters in filename | getVideoStreamUrl uses encodeURIComponent |
| Mobile browsers | Download attribute may open in new tab on some mobile browsers - this is acceptable fallback |

---

## Validation

### Automated Checks

```bash
# TypeScript type checking
cd frontend && npm run type-check

# Run relevant tests (if any)
npm test -- --testPathPattern="VideoPlayer|App"

# Lint
npm run lint
```

### Manual Verification

1. Open the app and click on any video to open the modal player
2. Verify the download button (↓) appears next to the close button (✕)
3. Click the download button and verify the video downloads
4. Verify the downloaded file plays correctly

---

## Scope Boundaries

**IN SCOPE:**

- Adding download button to the modal video player in App.tsx
- Using existing streaming URL infrastructure

**OUT OF SCOPE (do not touch):**

- Backend streaming endpoint changes
- VideoPlayer component changes (already has fallback download link)
- YouTube download functionality (separate feature)
- Batch download / download all videos feature

---

## Metadata

- **Investigated by**: GHAR
- **Timestamp**: 2026-03-08T18:45:00.000Z
- **Artifact**: `.ghar/issues/issue-31.md`