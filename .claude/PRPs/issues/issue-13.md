# Investigation: Add End-to-End Tests for Frontend + Backend YouTube Download Flow

**Issue**: #13 (https://github.com/tbrandenburg/sofathek/issues/13)
**Type**: ENHANCEMENT
**Investigated**: 2026-03-02T13:42:00Z

### Assessment

| Metric     | Value  | Reasoning                                                                                                     |
| ---------- | ------ | ------------------------------------------------------------------------------------------------------------- |
| Priority   | HIGH   | Critical gap in test coverage where backend infrastructure exists but lacks frontend integration validation   |
| Complexity | HIGH   | Requires implementing missing frontend UI components, API integration, and comprehensive multi-layer test suite |
| Confidence | HIGH   | Clear requirements, well-defined scope, existing backend infrastructure provides solid foundation               |

---

## Problem Statement

The application has robust backend YouTube download APIs and queue management but lacks frontend UI components and end-to-end test coverage to validate the complete user workflow from URL input to video availability.

---

## Analysis

### Change Rationale

**Current State**: Backend has comprehensive YouTube download infrastructure (API endpoints, queue service, file management) with unit and integration tests, but frontend only displays existing video library without YouTube download functionality.

**Gap Analysis**: The missing pieces are:
1. Frontend YouTube download UI components (form, queue display, progress indicators)
2. Frontend API service integration for YouTube endpoints
3. End-to-end test suite covering complete user workflows

**Value Proposition**: E2E tests ensure the complete user experience works correctly and catch integration issues that unit/integration tests miss.

### Evidence Chain

**ISSUE**: No E2E test coverage for YouTube download flow
↓ **BECAUSE**: Frontend YouTube UI components don't exist
**Evidence**: `frontend/src/App.tsx:1-82` - Only displays video library, no YouTube download form

↓ **BECAUSE**: Frontend API service lacks YouTube endpoint integration
**Evidence**: `frontend/src/services/api.ts:1-134` - Only has video library APIs, missing YouTube download functions

↓ **ROOT CAUSE**: E2E tests cannot be implemented without frontend UI to test against
**Evidence**: `frontend/tests/ci-minimal.spec.ts:1-25` - Only basic connectivity tests exist

### Affected Files

| File                                           | Lines     | Action | Description                               |
| ---------------------------------------------- | --------- | ------ | ----------------------------------------- |
| `frontend/src/components/YouTubeDownload.tsx` | NEW       | CREATE | Main YouTube download form component      |
| `frontend/src/components/DownloadQueue.tsx`   | NEW       | CREATE | Queue status display component            |
| `frontend/src/services/youtube.ts`            | NEW       | CREATE | YouTube API service functions             |
| `frontend/src/hooks/useYouTube.ts`            | NEW       | CREATE | React hooks for YouTube download state    |
| `frontend/src/App.tsx`                         | 1-82      | UPDATE | Integrate YouTube download components     |
| `frontend/tests/youtube-download/`             | NEW       | CREATE | E2E test directory structure              |
| `frontend/tests/fixtures/test-data.ts`        | NEW       | CREATE | Test URLs and mock data                   |
| `frontend/tests/utils/test-helpers.ts`         | NEW       | CREATE | Common E2E test utilities                 |

### Integration Points

- **Backend APIs**: `backend/src/routes/youtube.ts` - All YouTube endpoints implemented
- **Queue Service**: `backend/src/services/downloadQueueService.ts` - Queue management with file persistence
- **Frontend Library**: `frontend/src/services/api.ts:20` - Existing video library API pattern to mirror
- **Test Infrastructure**: `frontend/playwright.config.ts:1-101` - Playwright already configured

### Git History

- **Test Infrastructure**: commit `959c8b9` - 2024-12-xx - "fix: implement minimal CI-focused E2E test"
- **Backend Tests**: commit `6c8cbff` - 2024-12-xx - "Implement comprehensive backend test suite"
- **Implication**: Recent focus on test coverage, E2E infrastructure exists but needs YouTube-specific tests

---

## Implementation Plan

### Step 1: Create YouTube Download Form Component

**File**: `frontend/src/components/YouTubeDownload.tsx`
**Action**: CREATE

**Required implementation:**

```tsx
import React, { useState } from 'react';
import { useYouTubeDownload } from '../hooks/useYouTube';

export function YouTubeDownload() {
  const [url, setUrl] = useState('');
  const { downloadVideo, isLoading } = useYouTubeDownload();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      await downloadVideo({ url: url.trim() });
      setUrl('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="youtube-download-form">
      <div className="form-group">
        <label htmlFor="youtube-url">YouTube URL</label>
        <input
          id="youtube-url"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=..."
          disabled={isLoading}
          required
        />
      </div>
      <button type="submit" disabled={isLoading || !url.trim()}>
        {isLoading ? 'Adding to Queue...' : 'Download Video'}
      </button>
    </form>
  );
}
```

**Why**: Follows existing component patterns, provides accessible form with validation

---

### Step 2: Create Download Queue Display Component

**File**: `frontend/src/components/DownloadQueue.tsx`
**Action**: CREATE

**Required implementation:**

```tsx
import React from 'react';
import { useDownloadQueue } from '../hooks/useYouTube';

export function DownloadQueue() {
  const { queue, cancelDownload } = useDownloadQueue();

  if (queue.length === 0) {
    return <div className="download-queue-empty">No downloads in queue</div>;
  }

  return (
    <div className="download-queue">
      <h3>Download Queue</h3>
      {queue.map((item) => (
        <div key={item.id} className="queue-item" data-status={item.status}>
          <div className="queue-item-info">
            <span className="queue-item-title">{item.title || item.url}</span>
            <span className="queue-item-status">{item.status}</span>
          </div>
          {item.status === 'processing' && (
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${item.progress || 0}%` }}
              />
            </div>
          )}
          {['pending', 'processing'].includes(item.status) && (
            <button 
              onClick={() => cancelDownload(item.id)}
              className="cancel-button"
            >
              Cancel
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
```

**Why**: Real-time queue status display with progress indicators and cancel functionality

---

### Step 3: Create YouTube API Service

**File**: `frontend/src/services/youtube.ts`
**Action**: CREATE

**Required implementation:**

```typescript
import { api } from './api';

export interface DownloadRequest {
  url: string;
  quality?: string;
  format?: string;
}

export interface QueueItem {
  id: string;
  url: string;
  title?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress?: number;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

export const youtubeApi = {
  async downloadVideo(request: DownloadRequest): Promise<{ id: string }> {
    const response = await api.post('/youtube/download', request);
    return response.data;
  },

  async getQueue(): Promise<QueueItem[]> {
    const response = await api.get('/youtube/queue');
    return response.data.items;
  },

  async getDownloadStatus(id: string): Promise<QueueItem> {
    const response = await api.get(`/youtube/download/${id}/status`);
    return response.data;
  },

  async cancelDownload(id: string): Promise<void> {
    await api.delete(`/youtube/download/${id}`);
  },

  async healthCheck(): Promise<{ status: string }> {
    const response = await api.get('/youtube/health');
    return response.data;
  }
};
```

**Why**: Mirrors existing API service patterns from `frontend/src/services/api.ts`

---

### Step 4: Create YouTube React Hooks

**File**: `frontend/src/hooks/useYouTube.ts`
**Action**: CREATE

**Required implementation:**

```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { youtubeApi, DownloadRequest, QueueItem } from '../services/youtube';
import { toast } from 'react-hot-toast';

export function useYouTubeDownload() {
  const queryClient = useQueryClient();

  const downloadMutation = useMutation({
    mutationFn: youtubeApi.downloadVideo,
    onSuccess: () => {
      toast.success('Video added to download queue');
      queryClient.invalidateQueries({ queryKey: ['downloadQueue'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to add video to queue');
    }
  });

  return {
    downloadVideo: downloadMutation.mutate,
    isLoading: downloadMutation.isPending,
    error: downloadMutation.error
  };
}

export function useDownloadQueue() {
  const queryClient = useQueryClient();

  const queueQuery = useQuery({
    queryKey: ['downloadQueue'],
    queryFn: youtubeApi.getQueue,
    refetchInterval: 2000, // Poll every 2 seconds for real-time updates
  });

  const cancelMutation = useMutation({
    mutationFn: youtubeApi.cancelDownload,
    onSuccess: () => {
      toast.success('Download cancelled');
      queryClient.invalidateQueries({ queryKey: ['downloadQueue'] });
    },
    onError: () => {
      toast.error('Failed to cancel download');
    }
  });

  return {
    queue: queueQuery.data || [],
    isLoading: queueQuery.isLoading,
    cancelDownload: cancelMutation.mutate,
    refetch: queueQuery.refetch
  };
}
```

**Why**: Follows React Query patterns from existing `useVideos` hook

---

### Step 5: Integrate Components in App

**File**: `frontend/src/App.tsx`
**Lines**: 1-82
**Action**: UPDATE

**Current code:**

```tsx
function App() {
  return (
    <div className="App">
      <div className="app-header">
        <h1>Sofathek</h1>
        <p>Your Personal Video Library</p>
      </div>

      <VideoGrid />
    </div>
  );
}
```

**Required change:**

```tsx
import { YouTubeDownload } from './components/YouTubeDownload';
import { DownloadQueue } from './components/DownloadQueue';

function App() {
  return (
    <div className="App">
      <div className="app-header">
        <h1>Sofathek</h1>
        <p>Your Personal Video Library</p>
      </div>

      <div className="youtube-section">
        <h2>Download YouTube Videos</h2>
        <YouTubeDownload />
        <DownloadQueue />
      </div>

      <VideoGrid />
    </div>
  );
}
```

**Why**: Adds YouTube download functionality while preserving existing video library display

---

### Step 6: Create E2E Test Structure

**File**: `frontend/tests/fixtures/test-data.ts`
**Action**: CREATE

**Test data setup:**

```typescript
export const TEST_YOUTUBE_URLS = {
  // Short, reliable videos for testing
  VALID_SHORT: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  VALID_MEDIUM: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
  INVALID_URL: 'https://www.youtube.com/watch?v=invalid123',
  NOT_YOUTUBE: 'https://example.com/video.mp4'
} as const;

export const EXPECTED_QUEUE_STATES = [
  'pending',
  'processing', 
  'completed',
  'failed',
  'cancelled'
] as const;
```

**Why**: Provides consistent test data for reliable E2E testing

---

### Step 7: Create E2E Test Utilities

**File**: `frontend/tests/utils/test-helpers.ts`
**Action**: CREATE

**Helper functions:**

```typescript
import { Page, expect } from '@playwright/test';

export class YouTubeTestHelper {
  constructor(private page: Page) {}

  async navigateToApp() {
    await this.page.goto('/');
    await expect(this.page.getByRole('heading', { name: 'Sofathek' })).toBeVisible();
  }

  async submitYouTubeURL(url: string) {
    await this.page.getByLabel('YouTube URL').fill(url);
    await this.page.getByRole('button', { name: 'Download Video' }).click();
  }

  async waitForQueueItem(url: string, timeout = 30000) {
    await expect(
      this.page.getByText(url).or(this.page.getByText('Video Title'))
    ).toBeVisible({ timeout });
  }

  async waitForDownloadComplete(timeout = 60000) {
    await expect(
      this.page.getByText('completed')
    ).toBeVisible({ timeout });
  }

  async cancelDownload() {
    await this.page.getByRole('button', { name: 'Cancel' }).click();
  }
}
```

**Why**: Encapsulates common E2E test actions for reusability

---

### Step 8: Create Core E2E Tests

**File**: `frontend/tests/youtube-download/full-workflow.spec.ts`
**Action**: CREATE

**Complete workflow test:**

```typescript
import { test, expect } from '@playwright/test';
import { YouTubeTestHelper } from '../utils/test-helpers';
import { TEST_YOUTUBE_URLS } from '../fixtures/test-data';

test.describe('YouTube Download - Full Workflow', () => {
  let helper: YouTubeTestHelper;

  test.beforeEach(async ({ page }) => {
    helper = new YouTubeTestHelper(page);
    await helper.navigateToApp();
  });

  test('should complete full download workflow', async ({ page }) => {
    // Submit valid YouTube URL
    await helper.submitYouTubeURL(TEST_YOUTUBE_URLS.VALID_SHORT);

    // Verify item appears in queue
    await helper.waitForQueueItem(TEST_YOUTUBE_URLS.VALID_SHORT);
    
    // Wait for processing to start
    await expect(page.getByText('processing')).toBeVisible({ timeout: 10000 });
    
    // Wait for completion
    await helper.waitForDownloadComplete();
    
    // Verify video appears in library
    await expect(page.getByText('Rick Astley')).toBeVisible({ timeout: 5000 });
  });

  test('should handle invalid URLs gracefully', async ({ page }) => {
    await helper.submitYouTubeURL(TEST_YOUTUBE_URLS.INVALID_URL);
    
    // Should show error message
    await expect(page.getByText('Failed to add video to queue')).toBeVisible();
  });

  test('should allow cancelling downloads', async ({ page }) => {
    await helper.submitYouTubeURL(TEST_YOUTUBE_URLS.VALID_MEDIUM);
    await helper.waitForQueueItem(TEST_YOUTUBE_URLS.VALID_MEDIUM);
    
    // Cancel while pending/processing
    await helper.cancelDownload();
    
    // Verify cancelled state
    await expect(page.getByText('cancelled')).toBeVisible();
  });
});
```

**Why**: Tests complete user journey from URL input to video availability

---

## Patterns to Follow

**From codebase - mirror these exactly:**

```typescript
// SOURCE: frontend/src/hooks/useVideos.ts:8-25
// Pattern for React Query hook structure
export function useVideos() {
  return useQuery({
    queryKey: ['videos'],
    queryFn: async () => {
      const response = await api.get('/videos');
      return response.data;
    },
  });
}
```

```typescript
// SOURCE: frontend/src/services/api.ts:15-25
// Pattern for API service structure  
const api = axios.create({
  baseURL: 'http://localhost:3010/api',
  timeout: 10000,
});

export const videoApi = {
  async getVideos(): Promise<Video[]> {
    const response = await api.get('/videos');
    return response.data;
  }
};
```

```typescript
// SOURCE: frontend/tests/ci-minimal.spec.ts:8-15
// Pattern for Playwright test structure
test('should display app title', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Sofathek' })).toBeVisible();
});
```

---

## Edge Cases & Risks

| Risk/Edge Case                    | Mitigation                                        |
| --------------------------------- | ------------------------------------------------- |
| Long video downloads timeout      | Increase Playwright timeout, use shorter test videos |
| Network issues during E2E tests   | Implement retry logic, mock backend in CI        |
| Race conditions in queue polling  | Add proper wait conditions, test state transitions |
| Frontend/backend port conflicts   | Use dedicated test ports, Docker network isolation |
| Test data pollution              | Implement proper cleanup, use test-specific directories |

---

## Validation

### Automated Checks

```bash
# Frontend build and type checking
cd frontend && npm run type-check
cd frontend && npm run build

# Backend health check
cd backend && npm test -- youtube

# E2E test execution
cd frontend && npm run test:e2e

# Full integration test
make dev & sleep 10 && cd frontend && npm run test:e2e && make stop
```

### Manual Verification

1. Start development servers with `make dev`
2. Navigate to http://localhost:5183
3. Enter valid YouTube URL and verify download starts
4. Check queue updates in real-time
5. Verify completed video appears in library
6. Test error handling with invalid URLs
7. Test cancel functionality

---

## Scope Boundaries

**IN SCOPE:**

- Frontend YouTube download UI components
- Frontend API service integration
- Complete E2E test suite for download workflow
- Real-time queue status updates
- Error handling and user feedback

**OUT OF SCOPE (do not touch):**

- Backend YouTube download infrastructure (already implemented)
- Existing video library functionality
- Authentication/authorization features
- Advanced download options (quality, format selection)
- WebSocket implementation (use polling initially)

---

## Metadata

- **Investigated by**: Claude
- **Timestamp**: 2026-03-02T13:42:00Z
- **Artifact**: `.claude/PRPs/issues/issue-13.md`