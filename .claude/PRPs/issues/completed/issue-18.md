# Investigation: Remove demo videos

**Issue**: #18 (https://github.com/tbrandenburg/sofathek/issues/18)
**Type**: BUG
**Investigated**: 2026-03-03T23:00:00Z

### Assessment

| Metric     | Value    | Reasoning                                                                                                    |
| ---------- | -------- | ------------------------------------------------------------------------------------------------------------ |
| Severity   | MEDIUM   | Demo content is visible to users but doesn't break core functionality, has workaround of ignoring content |
| Complexity | MEDIUM   | Requires removing 9 video files and updating 45+ test references across multiple files                     |
| Confidence | HIGH     | Clear evidence of all video files and code references found through comprehensive codebase exploration     |

---

## Problem Statement

Demo videos still exist in the application and are visible to users. These videos include both stub files and real downloaded content totaling ~94MB that should be completely removed from the system.

---

## Analysis

### Root Cause Analysis

WHY: Demo videos are still visible in the application
↓ BECAUSE: Demo video files still exist in `/data/videos/` and `/backend/data/videos/`
Evidence: 9 video files found including `family-movie.mp4`, `nature-doc.mp4`, Rick Astley video

↓ BECAUSE: Demo video files were created for testing but never cleaned up
Evidence: Mix of stub files (28 bytes) and real downloaded content (up to 62MB)

↓ BECAUSE: No cleanup process exists for removing demo content after development
Evidence: Files span from initial development commits to recent feature additions

↓ BECAUSE: Tests have hardcoded dependencies on specific demo videos
Evidence: `frontend/tests/youtube-download/fixtures.ts:16-19` - Rick Astley video references

↓ ROOT CAUSE: Demo videos exist as both leftover development artifacts and hardcoded test dependencies
Evidence: 45+ code references across test files prevent clean removal without refactoring

### Evidence Chain

**Demo Video Files**:
- `/data/videos/family-movie.mp4` - 28 bytes stub file
- `/data/videos/nature-doc.mp4` - 27 bytes stub file  
- `/data/videos/vacation.mp4` - 26 bytes stub file
- `/backend/data/videos/Rick_Astley_-_Never_Gonna_Give_You_Up_(Official_Video)_(4K_Remaster)-dQw4w9WgXcQ.mp4` - 11.8MB
- `/backend/data/videos/Me_at_the_zoo-jNQXAC9IVRw.mp4` - 629KB
- Plus 4 more real videos totaling ~94MB

**Code References**:
- `frontend/tests/youtube-download/fixtures.ts:16` - `mockYouTubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'`
- `backend/src/test-youtube-download.ts:18` - Same Rick Astley video URL
- `backend/src/test-queue-service.ts:34` - Same video for queue testing
- 42+ additional references across test files

### Affected Files

| File                                              | Lines   | Action | Description                           |
| ------------------------------------------------- | ------- | ------ | ------------------------------------- |
| `/data/videos/`                                   | ALL     | DELETE | Remove all demo video files           |
| `/backend/data/videos/`                           | ALL     | DELETE | Remove all downloaded demo videos     |
| `/backend/temp/test-queue/`                       | ALL     | DELETE | Remove test queue artifacts           |
| `frontend/tests/youtube-download/fixtures.ts`    | 16-42   | UPDATE | Replace hardcoded URLs with generators |
| `backend/src/test-youtube-download.ts`            | 18      | UPDATE | Use dynamic test URL                  |
| `backend/src/test-queue-service.ts`               | 34      | UPDATE | Use dynamic test URL                  |
| `backend/src/test-download-queue.ts`              | 50,56   | UPDATE | Replace hardcoded video IDs           |
| `frontend/src/__tests__/VideoCard.test.tsx`      | Various | UPDATE | Use mock video generators             |
| `frontend/src/__tests__/VideoGrid.test.tsx`      | Various | UPDATE | Use mock video generators             |
| `backend/src/__tests__/unit/services/thumbnailService.test.ts` | 162     | UPDATE | Remove reference to test-video.mp4    |

### Integration Points

- Video streaming components depend on video files existing
- Thumbnail generation service references test thumbnails
- YouTube download service tests validate with real video IDs
- E2E tests in Playwright use hardcoded demo content
- Queue service tests depend on specific video metadata

### Git History

- **Introduced**: 7eb2c08 - 2026-03-03 - "feat(youtube): add complete YouTube download frontend with E2E tests"
- **Last modified**: 7153698 - 2026-03-03 - "fix: resolve FFmpeg configuration and restore YouTube download functionality" 
- **Implication**: Recently added for testing, not production data, safe to remove

---

## Implementation Plan

### Step 1: Remove Demo Video Files

**Files**: `/data/videos/*`, `/backend/data/videos/*`, `/backend/temp/test-queue/*`
**Action**: DELETE

**Current files:**
```bash
# Stub demo files (28 bytes each)
/data/videos/family-movie.mp4
/data/videos/nature-doc.mp4  
/data/videos/vacation.mp4
/data/videos/test-video.mp4

# Real downloaded videos (~94MB total)
/backend/data/videos/Rick_Astley_-_Never_Gonna_Give_You_Up_(Official_Video)_(4K_Remaster)-dQw4w9WgXcQ.mp4
/backend/data/videos/Me_at_the_zoo-jNQXAC9IVRw.mp4
/backend/data/videos/Build_BEAUTIFUL_Diagrams_with_Claude_Code_(Full_Workflow)-m3fqyXZ4k4I.mp4
/backend/data/videos/The_ONLY_AI_Tech_Stack_You_Need_in_2026-21_k2St8bBI.mp4

# Test artifacts
/backend/temp/test-queue/*.mp4
/backend/data/thumbnails/test_thumbnail.jpg
```

**Required change:**
```bash
# Remove all demo video directories
rm -rf /data/videos/
rm -rf /backend/data/videos/
rm -rf /backend/temp/test-queue/
rm -f /backend/data/thumbnails/test_thumbnail.jpg
```

**Why**: These are demo/test artifacts not needed in production

---

### Step 2: Create Dynamic Test Fixtures

**File**: `frontend/tests/youtube-download/fixtures.ts`
**Lines**: 16-42
**Action**: UPDATE

**Current code:**
```typescript
// Line 16-19
export const mockYouTubeUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
export const mockVideoId = 'dQw4w9WgXcQ';
export const mockVideoTitle = 'Rick Astley - Never Gonna Give You Up (Official Video) (4K Remaster)';
export const mockThumbnailUrl = 'https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg';

// Line 32
mockUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',

// Line 42  
videoId: 'dQw4w9WgXcQ',
```

**Required change:**
```typescript
// Generate random test video data
export function generateMockVideoId(): string {
  return 'test_' + Math.random().toString(36).substr(2, 9);
}

export function generateMockYouTubeUrl(): string {
  return `https://www.youtube.com/watch?v=${generateMockVideoId()}`;
}

export function createMockVideo(overrides: Partial<MockVideo> = {}): MockVideo {
  const videoId = generateMockVideoId();
  return {
    videoId,
    mockUrl: `https://www.youtube.com/watch?v=${videoId}`,
    title: overrides.title || `Test Video ${videoId}`,
    thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
    ...overrides
  };
}
```

**Why**: Removes hardcoded demo video dependencies, enables dynamic test data

---

### Step 3: Update Test Files to Use Dynamic Data

**File**: `backend/src/test-youtube-download.ts`
**Lines**: 18
**Action**: UPDATE

**Current code:**
```typescript
// Line 18
const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
```

**Required change:**
```typescript
import { generateMockYouTubeUrl } from '../../frontend/tests/youtube-download/fixtures';

const testUrl = generateMockYouTubeUrl();
```

**Why**: Use dynamic test data instead of hardcoded Rick Astley video

---

### Step 4: Update Queue Service Tests

**File**: `backend/src/test-queue-service.ts`
**Lines**: 34
**Action**: UPDATE

**Current code:**
```typescript
// Line 34
url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
```

**Required change:**
```typescript
import { generateMockYouTubeUrl } from '../../frontend/tests/youtube-download/fixtures';

url: generateMockYouTubeUrl()
```

**Why**: Remove hardcoded demo video dependency

---

### Step 5: Update Download Queue Tests

**File**: `backend/src/test-download-queue.ts`  
**Lines**: 50, 56
**Action**: UPDATE

**Current code:**
```typescript
// Line 50
url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'

// Line 56
url: 'https://www.youtube.com/watch?v=YE7VzlLtp-4'
```

**Required change:**
```typescript
import { generateMockYouTubeUrl } from '../../frontend/tests/youtube-download/fixtures';

url: generateMockYouTubeUrl()
// ... and second instance
url: generateMockYouTubeUrl()
```

**Why**: Remove all hardcoded YouTube video references

---

### Step 6: Update Component Tests

**File**: `frontend/src/__tests__/VideoCard.test.tsx`
**Action**: UPDATE

**Current pattern:**
```typescript
const mockVideo = {
  id: 'test-video',
  title: 'Test Video',
  // ... hardcoded test data
};
```

**Required change:**
```typescript
import { createMockVideo } from '../tests/youtube-download/fixtures';

const mockVideo = createMockVideo({
  title: 'Test Video'
});
```

**Why**: Use centralized mock data generation

---

### Step 7: Update Thumbnail Service Tests

**File**: `backend/src/__tests__/unit/services/thumbnailService.test.ts`
**Lines**: 162  
**Action**: UPDATE

**Current code:**
```typescript
// Line 162
const videoPath = '/data/test-video.mp4';
```

**Required change:**
```typescript
const videoPath = `/tmp/test-video-${Date.now()}.mp4`;
```

**Why**: Use temporary test file instead of referencing deleted demo video

---

### Step 8: Clean Up Playwright Test Artifacts  

**Files**: `frontend/playwright-report/`, `frontend/test-results/`
**Action**: UPDATE .gitignore

**Required change:**
```gitignore
# Add to .gitignore
frontend/playwright-report/
frontend/test-results/
backend/temp/test-queue/
backend/data/videos/*.mp4
data/videos/*.mp4
```

**Why**: Prevent test artifacts from being committed

---

## Patterns to Follow

**From codebase - mirror these exactly:**

```typescript
// SOURCE: backend/src/types/video.ts:15-25
// Pattern for video object structure  
export interface Video {
  id: string;
  title: string;
  url: string;
  thumbnailUrl?: string;
  duration?: number;
  createdAt: Date;
}
```

```typescript
// SOURCE: frontend/src/__tests__/api.test.ts:20-30
// Pattern for mock data generation
const createMockResponse = (overrides = {}) => ({
  success: true,
  data: {
    id: 'mock-id',
    ...overrides
  }
});
```

---

## Edge Cases & Risks

| Risk/Edge Case                           | Mitigation                                                         |
| ---------------------------------------- | ------------------------------------------------------------------ |
| Tests fail after removing demo videos    | Update tests to use dynamic mock data before removing files       |
| E2E tests expect specific video content  | Update E2E tests to be content-agnostic or use generated test data |
| Thumbnail generation breaks              | Update thumbnail tests to create temporary test files             |
| Real YouTube API calls in tests         | Ensure all tests use mocked YouTube API responses                  |
| Git history shows large file removals   | Document removal in commit message as intentional cleanup         |

---

## Validation

### Automated Checks

```bash
# Run tests to ensure no broken references
npm test
npm run test:e2e

# Check for any remaining references to demo videos  
grep -r "dQw4w9WgXcQ" . --exclude-dir=node_modules --exclude-dir=.git
grep -r "family-movie\|nature-doc\|vacation\.mp4" . --exclude-dir=node_modules --exclude-dir=.git

# Verify video directories are clean
ls -la data/videos/ || echo "Directory removed successfully"
ls -la backend/data/videos/ || echo "Directory removed successfully"

# Run build to ensure no missing file references
npm run build
```

### Manual Verification

1. Start application and verify no demo videos appear in UI
2. Run YouTube download feature to ensure it still works without demo content
3. Check that test suite passes with dynamic mock data
4. Verify no 404 errors for missing video files in browser console

---

## Scope Boundaries

**IN SCOPE:**
- Remove all demo video files (9 files, ~94MB)  
- Update test files to use dynamic mock data
- Remove hardcoded YouTube video references
- Clean up test artifacts and temporary files

**OUT OF SCOPE (do not touch):**
- Production video upload/download functionality
- Core video streaming components
- YouTube API integration logic
- Database schema changes
- Video processing pipeline

---

## Metadata

- **Investigated by**: Claude
- **Timestamp**: 2026-03-03T23:00:00Z
- **Artifact**: `.claude/PRPs/issues/issue-18.md`