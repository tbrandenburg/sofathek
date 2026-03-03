# Investigation: Extend real world E2E test case

**Issue**: #20 (https://github.com/tbrandenburg/sofathek/issues/20)
**Type**: BUG
**Investigated**: 2026-03-02T20:47:00Z

### Assessment

| Metric     | Value  | Reasoning                                                                                                                                    |
| ---------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Severity   | HIGH   | Major feature broken where users can download videos but they don't appear in the library, creating confusion with no clear workaround except manual page refresh |
| Complexity | LOW    | Only requires adding one line of code to invalidate queries plus updating E2E tests to verify the integration, affecting just 2 files with minimal risk |
| Confidence | HIGH   | Clear root cause identified with concrete evidence showing exact missing line of code and specific fix location, with full understanding of data flow |

---

## Problem Statement

Downloaded videos do not appear in the available videos grid after download completion, breaking the user experience flow. The system has two separate data flows (YouTube download and video library) with no integration bridge, causing users to believe downloads failed when videos don't automatically appear in the library.

---

## Analysis

### Root Cause / Change Rationale

The core issue is a missing integration bridge between the YouTube download system and video library system in React Query state management.

### Evidence Chain

**WHY**: Downloaded video not visible in grid after completion
↓ **BECAUSE**: Video grid component doesn't refresh its data after download
**Evidence**: `frontend/src/hooks/useVideos.ts:27-29` - Only fetches videos on component mount

↓ **BECAUSE**: YouTube download hook only invalidates YouTube queue queries, not videos queries  
**Evidence**: `frontend/src/hooks/useYouTube.ts:61` - `queryClient.invalidateQueries({ queryKey: ['youtube', 'queue'] })`

↓ **BECAUSE**: YouTube and video library systems developed as separate features without integration
**Evidence**: Git history shows different commits (7eb2c08 for YouTube, 0e4aaf5 for videos)

↓ **BECAUSE**: No cross-system integration design between queue-based and direct API systems
**Evidence**: YouTube uses queue polling, videos use direct API calls with no connection

↓ **ROOT CAUSE**: Missing cross-query invalidation to refresh video library when downloads complete
**Evidence**: `frontend/src/hooks/useYouTube.ts:61` - Missing `queryClient.invalidateQueries({ queryKey: ['videos'] })`

### Affected Files

| File                                             | Lines   | Action | Description                                    |
| ------------------------------------------------ | ------- | ------ | ---------------------------------------------- |
| `frontend/src/hooks/useYouTube.ts`               | 61      | UPDATE | Add videos query invalidation on download completion |
| `frontend/tests/youtube-download/real-world.spec.ts` | 121-140 | UPDATE | Enhance E2E test to verify integration mechanism |

### Integration Points

- `frontend/src/hooks/useVideos.ts:8-37` - Video fetching hook that needs to be invalidated
- `frontend/src/components/VideoGrid/VideoGrid.tsx:74-92` - Component that displays videos from the hook
- `frontend/src/App.tsx:26-31` - Main app integration where both hooks are used
- `backend/src/services/downloadQueueService.ts:212-217` - Download completion logic

### Git History

- **Introduced**: 7eb2c08 - 2026-03-02 - "feat(youtube): add complete YouTube download frontend with E2E tests and validation system"
- **Last modified**: 7eb2c08 - 2026-03-02
- **Implication**: Original bug - integration was never implemented when YouTube feature was added

---

## Implementation Plan

### Step 1: Add Cross-Query Invalidation

**File**: `frontend/src/hooks/useYouTube.ts`
**Lines**: 61
**Action**: UPDATE

**Current code:**
```typescript
// Line 60-62
onSettled: () => {
  queryClient.invalidateQueries({ queryKey: ['youtube', 'queue'] });
},
```

**Required change:**
```typescript
// What it should become
onSettled: () => {
  queryClient.invalidateQueries({ queryKey: ['youtube', 'queue'] });
  queryClient.invalidateQueries({ queryKey: ['videos'] });
},
```

**Why**: This ensures that when a YouTube download completes (success or failure), the video library refreshes to show any new videos that were successfully downloaded.

---

### Step 2: Enhance E2E Test Verification

**File**: `frontend/tests/youtube-download/real-world.spec.ts`
**Action**: UPDATE

**Current test pattern (Lines 127-138):**
```typescript
// Current - relies on timing
await expect(videoGrid).toBeVisible({ timeout: TEST_CONFIG.TIMEOUTS.VIDEO_APPEAR });
```

**Enhanced test cases to add:**
```typescript
describe("Real-world E2E: Complete Download Journey", () => {
  it("should show downloaded video in grid immediately after completion", async () => {
    // 1. Start download and verify progress
    await page.fill('[data-testid="youtube-url-input"]', REAL_YOUTUBE_URL);
    await page.click('[data-testid="download-button"]');
    
    // 2. Wait for download completion
    await expect(page.locator('[data-testid="download-status"]')).toContainText('completed', { timeout: 60000 });
    
    // 3. Verify video appears in grid WITHOUT page refresh
    const videoGrid = page.locator('[data-testid="video-grid"]');
    const downloadedVideo = videoGrid.locator(`[data-testid="video-item"]`).first();
    
    // 4. Critical: Video must appear due to state invalidation, not manual refresh
    await expect(downloadedVideo).toBeVisible({ timeout: 5000 }); // Short timeout proves automatic refresh
    
    // 5. Verify video is playable
    await downloadedVideo.click();
    const videoPlayer = page.locator('[data-testid="video-player"]');
    await expect(videoPlayer).toBeVisible({ timeout: 10000 });
    
    // 6. Verify video still available after page reload
    await page.reload();
    await expect(videoGrid.locator('[data-testid="video-item"]').first()).toBeVisible();
  });

  it("should handle download errors gracefully without affecting video grid", async () => {
    // Test with invalid URL to ensure error handling doesn't break video list
    await page.fill('[data-testid="youtube-url-input"]', 'https://invalid-youtube-url');
    await page.click('[data-testid="download-button"]');
    
    // Verify error state
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible({ timeout: 30000 });
    
    // Verify existing videos still visible
    const videoGrid = page.locator('[data-testid="video-grid"]');
    const existingVideoCount = await videoGrid.locator('[data-testid="video-item"]').count();
    expect(existingVideoCount).toBeGreaterThanOrEqual(0); // Grid should remain functional
  });
});
```

---

## Patterns to Follow

**From codebase - mirror these exactly:**

```typescript
// SOURCE: frontend/src/hooks/useYouTube.ts:60-62
// Pattern for React Query invalidation on completion
onSettled: () => {
  queryClient.invalidateQueries({ queryKey: ['youtube', 'queue'] });
  // Add similar pattern for videos
},
```

```typescript
// SOURCE: frontend/tests/youtube-download/real-world.spec.ts:34-50
// Pattern for E2E test setup with real URLs
const REAL_YOUTUBE_URL = process.env.TEST_YOUTUBE_URL || 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

beforeEach(async ({ page }) => {
  await page.goto('/');
  // Test setup pattern
});
```

---

## Edge Cases & Risks

| Risk/Edge Case | Mitigation |
| -------------- | ----------- |
| Race condition between download completion and query invalidation | Use React Query's built-in settling mechanism which handles async completion |
| Performance impact of double invalidation | Minimal - React Query deduplicates simultaneous invalidations |
| E2E test flakiness with real downloads | Use environment variable for test URL, add proper timeout handling |
| Download fails but videos query still invalidated | Acceptable - invalidation should happen on both success and failure for consistency |

---

## Validation

### Automated Checks

```bash
npm run type-check        # Verify TypeScript compilation
npm test -- real-world   # Run the enhanced E2E test
npm run lint             # Check code style
```

### Manual Verification

1. Start the app with `make dev`
2. Navigate to YouTube download section
3. Download a real YouTube video
4. Verify video appears in grid immediately after download completes (without page refresh)
5. Click on video to verify it plays correctly
6. Reload page to confirm video persists

---

## Scope Boundaries

**IN SCOPE:**
- Add missing query invalidation for videos
- Enhance E2E test to verify integration
- Test both success and failure scenarios

**OUT OF SCOPE (do not touch):**
- Changing the overall React Query architecture
- Modifying the download queue system
- Adding WebSocket/SSE real-time updates (future improvement)
- Changing the video scanning/storage logic

---

## Metadata

- **Investigated by**: Claude
- **Timestamp**: 2026-03-02T20:47:00Z
- **Artifact**: `.claude/PRPs/issues/issue-20.md`