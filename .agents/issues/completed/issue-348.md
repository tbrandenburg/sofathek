# Investigation: Add configurable total download size limit (default 5GB)

**Issue**: #348 (https://github.com/tbrandenburg/sofathek/issues/348)
**Type**: ENHANCEMENT
**Investigated**: 2026-06-22T00:00:00Z

### Assessment

| Metric     | Value  | Reasoning                                                                                                         |
| ---------- | ------ | ----------------------------------------------------------------------------------------------------------------- |
| Priority   | MEDIUM | Prevents runaway storage but is not blocking other work; admin can manually manage storage today as a workaround |
| Complexity | LOW    | 2 core files (config + download service) plus .env.example, README, DEPLOYMENT.md, and tests — no architectural changes |
| Confidence | HIGH   | `filesizeApprox` is already extracted by `youTubeMetadataExtractor.ts:71` and available in `YouTubeMetadata`; code path from metadata extraction to download is clear at `youTubeDownloadService.ts:56-64` |

## Problem Statement

Sofathek initiates yt-dlp downloads without any cap on the combined size of files produced. Since a single request can generate video, audio, subtitles, and thumbnails/sidecars, storage can be silently exhausted. There is no config option to set a maximum total download size, no pre-download check, and no error message surfaced to the admin UI when a download would exceed available/allowed storage.

## Analysis

### Change Rationale

Add `DOWNLOAD_MAX_SIZE_BYTES` env var (default 5GB) to `Config`. After metadata extraction in `downloadVideo()`, compare `metadata.filesizeApprox` against the limit and throw an `AppError` (HTTP 400) if exceeded. When `filesizeApprox` is absent (live streams, private videos, etc.) the check is skipped and the download proceeds — best-effort guard, not a hard gate.

### Evidence Chain

WHY: Runaway storage when downloading large or multi-file content
↓ BECAUSE: No pre-download size check exists anywhere in the pipeline
Evidence: `backend/src/services/youTubeDownloadService.ts:56-64` — metadata extract flows directly into `fileDownloader.download()` with no size gate between them

↓ BECAUSE: `filesizeApprox` is already available in `YouTubeMetadata` but is never consumed for validation
Evidence: `backend/src/services/youTubeMetadataExtractor.ts:71` — `if (metadata.filesize_approx != null) result.filesizeApprox = metadata.filesize_approx;`
Evidence: `backend/src/types/youtube.ts:76` — `filesizeApprox?: number;` — field is present on the interface

↓ BECAUSE: `Config` interface has no `downloadMaxSizeBytes` field, so no limit is ever loaded or checked
Evidence: `backend/src/config.ts:4-21` — full `Config` interface has no size limit field; `getConfig()` at line `59-78` has no corresponding env var parse

↓ ROOT CAUSE: The feature simply does not exist yet — no limit field in config, no check in the download orchestrator
Evidence: `backend/src/config.ts:77` — last field is `videoMaxAgeDays: parsePositiveIntOrDefault(process.env.VIDEO_MAX_AGE_DAYS, 30),` — no download size entry follows

### Affected Files

| File                                                                         | Lines           | Action | Description                                                   |
| ---------------------------------------------------------------------------- | --------------- | ------ | ------------------------------------------------------------- |
| `backend/src/config.ts`                                                      | 20-21, 77-78    | UPDATE | Add `downloadMaxSizeBytes` to `Config` interface and `getConfig()` |
| `backend/src/services/youTubeDownloadService.ts`                             | 63-64 (between) | UPDATE | Insert size check after metadata logging, before `fileDownloader.download()` |
| `backend/.env.example`                                                       | 31 (append)     | UPDATE | Add `DOWNLOAD_MAX_SIZE_BYTES=5368709120`                      |
| `README.md`                                                                  | 212-213 (between) | UPDATE | Add `DOWNLOAD_MAX_SIZE_BYTES` row to env vars table           |
| `docs/DEPLOYMENT.md`                                                         | 112-113         | UPDATE | Replace aspirational `MAX_DOWNLOAD_SIZE=2147483648` with `DOWNLOAD_MAX_SIZE_BYTES=5368709120` |
| `backend/src/__tests__/unit/config.test.ts`                                  | 70 (append)     | UPDATE | Add tests for `downloadMaxSizeBytes` config field             |
| `backend/src/__tests__/unit/services/youTubeDownloadService.test.ts`         | 334 (append)    | UPDATE | Add `describe('download size limit', ...)` block              |

### Integration Points

- `backend/src/services/youTubeDownloadService.ts:56` — `this.metadataExtractor.extract(url)` returns `YouTubeMetadata` which already carries `filesizeApprox`. The size check is inserted immediately after the metadata log block (lines 57-62), before line 64.
- `backend/src/services/queueScheduler.ts` — calls `youtubeDownloadService.downloadVideo()` and wraps results; the thrown `AppError` will be caught by the existing `try/catch` at `youTubeDownloadService.ts:139`, converting it to `status: 'error'` — no changes needed.
- `backend/src/routes/youtube.ts` — the error surfaces via queue item `status: 'failed'` with the `error` field populated by the `AppError` message. No route changes needed.
- `backend/src/middleware/errorHandler.ts:7-21` — `AppError` already supports `statusCode` and `isOperational`. Use `new AppError(message, 400)` to signal a client-correctable condition.

### Git History

- **`backend/src/config.ts` last modified**: `fadf82c` — "Fix: require sidecar for video cleanup (#315)"
- **`backend/src/services/youTubeDownloadService.ts` last modified**: `235194a` — "feat: prefer yt-dlp thumbnail over ffmpeg generation (#301)"
- **Implication**: Greenfield feature — no regression concern, no prior attempt at a size limit in these files.

### Docs Discrepancy

`docs/DEPLOYMENT.md:113` and `:270` already reference `MAX_DOWNLOAD_SIZE=2147483648` (2GB). This was aspirational documentation — it was never implemented. The implementation must:
- Use `DOWNLOAD_MAX_SIZE_BYTES` (name from the issue author)
- Default to `5368709120` (5GB) per AC
- Update DEPLOYMENT.md both occurrences to match

## Implementation Plan

### Step 1: Add `downloadMaxSizeBytes` to Config

**File**: `backend/src/config.ts`
**Action**: UPDATE

**Current code (Config interface, line 20):**

```typescript
  videoMaxAgeDays: number;
}
```

**Required change:**

```typescript
  videoMaxAgeDays: number;
  downloadMaxSizeBytes: number;
}
```

**Current code (getConfig return, line 77-78):**

```typescript
    videoMaxAgeDays: parsePositiveIntOrDefault(process.env.VIDEO_MAX_AGE_DAYS, 30),
  };
```

**Required change:**

```typescript
    videoMaxAgeDays: parsePositiveIntOrDefault(process.env.VIDEO_MAX_AGE_DAYS, 30),
    downloadMaxSizeBytes: parsePositiveIntOrDefault(process.env.DOWNLOAD_MAX_SIZE_BYTES, 5 * 1024 * 1024 * 1024),
  };
```

**Why**: Uses the existing `parsePositiveIntOrDefault` helper (same as `videoMaxAgeDays`) ensuring `0` and negative values fall back to the 5GB default. `5 * 1024 * 1024 * 1024 = 5368709120`.

---

### Step 2: Insert size check in download orchestrator

**File**: `backend/src/services/youTubeDownloadService.ts`
**Action**: UPDATE

First, add `config` import at the top of the file (line 1-12 import block):

**Add import (after existing imports):**

```typescript
import { config } from '../config';
```

**Current code (lines 56-64):**

```typescript
      const metadata = await this.metadataExtractor.extract(request.url);
      logger.info('Retrieved video metadata', {
        downloadId,
        videoId: metadata.id,
        title: metadata.title,
        duration: metadata.duration
      });

      const tempVideoPath = await this.fileDownloader.download(request.url, metadata, subprocessKey, progressCallback);
```

**Required change — insert size check after the metadata log block:**

```typescript
      const metadata = await this.metadataExtractor.extract(request.url);
      logger.info('Retrieved video metadata', {
        downloadId,
        videoId: metadata.id,
        title: metadata.title,
        duration: metadata.duration
      });

      if (metadata.filesizeApprox != null && metadata.filesizeApprox > config.downloadMaxSizeBytes) {
        const sizeMB = Math.round(metadata.filesizeApprox / (1024 * 1024));
        const limitMB = Math.round(config.downloadMaxSizeBytes / (1024 * 1024));
        throw new AppError(
          `Download size (${sizeMB}MB) exceeds maximum allowed size of ${limitMB}MB`,
          400
        );
      }

      const tempVideoPath = await this.fileDownloader.download(request.url, metadata, subprocessKey, progressCallback);
```

**Also add `AppError` import** — it is already used by `youTubeMetadataExtractor.ts`; check if it needs adding to `youTubeDownloadService.ts`:

```typescript
import { AppError } from '../middleware/errorHandler';
```

Add alongside the other imports at the top.

**Why**: `filesizeApprox` is `undefined` when yt-dlp cannot determine size (live streams, private, age-restricted) — the `!= null` guard skips the check in those cases. HTTP 400 signals a client-correctable condition (request too large). The error message includes both actual and limit in MB, surfaceable by the frontend.

---

### Step 3: Update `.env.example`

**File**: `backend/.env.example`
**Action**: UPDATE

**Current content (end of file, line 30-31):**

```
# Resource Cleanup
VIDEO_MAX_AGE_DAYS=30
```

**Required change:**

```
# Resource Cleanup
VIDEO_MAX_AGE_DAYS=30

# Download Limits
DOWNLOAD_MAX_SIZE_BYTES=5368709120
```

**Why**: Documents the new env var with its exact default value (5 * 1024³) in the same format as the other vars.

---

### Step 4: Update README env vars table

**File**: `README.md`
**Action**: UPDATE

**Current content (lines 212-213):**

```markdown
| `RATE_LIMIT_WINDOW_MS` | `3600000` (1 hour) | Rate limiting window in milliseconds |

## Requirements
```

**Required change:**

```markdown
| `RATE_LIMIT_WINDOW_MS` | `3600000` (1 hour) | Rate limiting window in milliseconds |
| `DOWNLOAD_MAX_SIZE_BYTES` | `5368709120` (5GB) | Maximum total download size in bytes; requests exceeding this limit are rejected before any file transfer starts |

## Requirements
```

**Why**: Keeps the env var reference table complete. `VIDEO_MAX_AGE_DAYS` is also missing from the table (pre-existing gap, out of scope for this PR) — do not add it here to keep the diff focused.

---

### Step 5: Update DEPLOYMENT.md

**File**: `docs/DEPLOYMENT.md`
**Action**: UPDATE

Two occurrences of the old aspirational `MAX_DOWNLOAD_SIZE` key need updating.

**Occurrence 1 (line 111-113):**

Current:
```
# YouTube-DL Settings
YOUTUBE_DL_FORMAT=bestvideo[height<=720]+bestaudio/best[height<=720]
MAX_DOWNLOAD_SIZE=2147483648  # 2GB in bytes
```

Replace only line 113:
```
DOWNLOAD_MAX_SIZE_BYTES=5368709120  # 5GB in bytes (default)
```

**Occurrence 2 (line 268-270):**

Current:
```
# Maximum file size (2GB default)
MAX_DOWNLOAD_SIZE=2147483648
```

Replace these two lines:
```
# Maximum total download size in bytes (5GB default)
DOWNLOAD_MAX_SIZE_BYTES=5368709120
```

**Why**: The old `MAX_DOWNLOAD_SIZE` was never implemented. Aligning docs with the actual implementation prevents admin confusion. The `YOUTUBE_DL_FORMAT` and `DOWNLOAD_TIMEOUT` references in that section are also aspirational/non-functional — leave them as-is (out of scope).

---

### Step 6: Add tests

#### 6a: Config unit tests

**File**: `backend/src/__tests__/unit/config.test.ts`
**Action**: UPDATE (append after line 69)

**Test cases to add:**

```typescript
  it('should parse DOWNLOAD_MAX_SIZE_BYTES as a positive integer', () => {
    process.env.DOWNLOAD_MAX_SIZE_BYTES = '1073741824'; // 1GB

    jest.isolateModules(() => {
      const { config } = require('../../config');
      expect(config.downloadMaxSizeBytes).toBe(1073741824);
    });
  });

  it('should use default DOWNLOAD_MAX_SIZE_BYTES when invalid or destructive', () => {
    for (const value of ['invalid', '1abc', '0', '-1']) {
      jest.resetModules();
      process.env = { ...originalEnv, DOWNLOAD_MAX_SIZE_BYTES: value };

      jest.isolateModules(() => {
        const { config } = require('../../config');
        expect(config.downloadMaxSizeBytes).toBe(5 * 1024 * 1024 * 1024);
      });
    }
  });

  it('should use default DOWNLOAD_MAX_SIZE_BYTES when not set', () => {
    delete process.env.DOWNLOAD_MAX_SIZE_BYTES;

    jest.isolateModules(() => {
      const { config } = require('../../config');
      expect(config.downloadMaxSizeBytes).toBe(5 * 1024 * 1024 * 1024);
    });
  });
```

**Pattern mirrored from**: `config.test.ts:50-69` — `VIDEO_MAX_AGE_DAYS` tests.

#### 6b: Download service unit tests

**File**: `backend/src/__tests__/unit/services/youTubeDownloadService.test.ts`
**Action**: UPDATE (append new `describe` block after line 334, before closing `});`)

**Test cases to add:**

```typescript
  describe('download size limit', () => {
    const baseMetadata = {
      id: 'abc123',
      title: 'Test Video',
      webpageUrl: 'https://www.youtube.com/watch?v=abc123'
    };

    beforeEach(() => {
      jest.clearAllMocks();
      mockValidate.mockResolvedValue(true);
      mockEnsureDirectories.mockResolvedValue(undefined);
    });

    it('should reject download when filesizeApprox exceeds config limit', async () => {
      // 6GB > default 5GB limit
      mockExtract.mockResolvedValue({ ...baseMetadata, filesizeApprox: 6 * 1024 * 1024 * 1024 });

      const result = await service.downloadVideo({
        url: 'https://www.youtube.com/watch?v=abc123',
        title: 'Test Video',
        requestedAt: new Date(),
        requestId: 'req-size-over'
      });

      expect(result.status).toBe('error');
      expect(result.error).toMatch(/exceeds maximum allowed size/);
      expect(mockDownload).not.toHaveBeenCalled();
    });

    it('should allow download when filesizeApprox is under config limit', async () => {
      // 1GB < default 5GB limit
      mockExtract.mockResolvedValue({ ...baseMetadata, filesizeApprox: 1 * 1024 * 1024 * 1024 });
      mockDownload.mockResolvedValue('/test/temp/Test_Video-abc123.mp4');
      mockMoveToLibrary.mockResolvedValue('/test/videos/Test_Video-abc123.mp4');
      mockWriteFile.mockResolvedValue(undefined);
      mockRename.mockResolvedValue(undefined);
      mockAccess.mockRejectedValue(new Error('ENOENT'));

      const result = await service.downloadVideo({
        url: 'https://www.youtube.com/watch?v=abc123',
        title: 'Test Video',
        requestedAt: new Date(),
        requestId: 'req-size-under'
      });

      expect(result.status).toBe('success');
      expect(mockDownload).toHaveBeenCalled();
    });

    it('should allow download when filesizeApprox is undefined (missing metadata)', async () => {
      // No size info (live stream, private video, etc.) — check must be skipped
      mockExtract.mockResolvedValue({ ...baseMetadata, filesizeApprox: undefined });
      mockDownload.mockResolvedValue('/test/temp/Test_Video-abc123.mp4');
      mockMoveToLibrary.mockResolvedValue('/test/videos/Test_Video-abc123.mp4');
      mockWriteFile.mockResolvedValue(undefined);
      mockRename.mockResolvedValue(undefined);
      mockAccess.mockRejectedValue(new Error('ENOENT'));

      const result = await service.downloadVideo({
        url: 'https://www.youtube.com/watch?v=abc123',
        title: 'Test Video',
        requestedAt: new Date(),
        requestId: 'req-size-missing'
      });

      expect(result.status).toBe('success');
      expect(mockDownload).toHaveBeenCalled();
    });
  });
```

**Why**: Three cases map directly to the acceptance criteria: over-limit (rejected, no download), under-limit (allowed), missing metadata (allowed). The over-limit test asserts `mockDownload` was NOT called — this is the critical invariant that no file transfer started.

**Note on mocking `config`**: The test uses the default `config.downloadMaxSizeBytes` value (5GB) set by the real config module. If tests run in an environment where `DOWNLOAD_MAX_SIZE_BYTES` is set to something else, the over-limit test could flap. To make it deterministic, either:
- Mock `config` module in the test file: `jest.mock('../../../config', () => ({ config: { downloadMaxSizeBytes: 5 * 1024 * 1024 * 1024 } }))`, or
- Use `jest.isolateModules` with the env var cleared

The simplest approach is to add a `jest.mock('../../../config', ...)` at the top of the test file alongside the other mocks, exporting the full real config shape but with a fixed `downloadMaxSizeBytes`.

---

## Patterns to Follow

**From codebase — mirror these exactly:**

```typescript
// SOURCE: backend/src/config.ts:36-39
// Pattern for parsePositiveIntOrDefault — rejects 0 and negative
function parsePositiveIntOrDefault(value: string | undefined, defaultValue: number): number {
  const parsed = parseIntOrDefault(value, defaultValue);
  return parsed > 0 ? parsed : defaultValue;
}
```

```typescript
// SOURCE: backend/src/__tests__/unit/config.test.ts:59-69
// Pattern for testing parsePositiveIntOrDefault behavior (VIDEO_MAX_AGE_DAYS)
it('should use default VIDEO_MAX_AGE_DAYS when invalid or destructive', () => {
  for (const value of ['invalid', '1abc', '0', '-1']) {
    jest.resetModules();
    process.env = { ...originalEnv, VIDEO_MAX_AGE_DAYS: value };
    jest.isolateModules(() => {
      const { config } = require('../../config');
      expect(config.videoMaxAgeDays).toBe(30);
    });
  }
});
```

```typescript
// SOURCE: backend/src/services/youTubeMetadataExtractor.ts:5,30
// Pattern for AppError import and throw
import { AppError } from '../middleware/errorHandler';
// ...
throw new AppError('message', 400);
```

```typescript
// SOURCE: backend/src/services/youTubeDownloadService.ts:50-52
// Pattern for pre-download guard with throw (URL validation)
if (!await this.urlValidator.validate(request.url)) {
  throw new Error('Invalid video URL format');
}
```

## Edge Cases & Risks

| Risk/Edge Case | Mitigation |
| -------------- | ---------- |
| `filesizeApprox` is `undefined` (live streams, private/age-restricted videos, some extractors) | `!= null` guard skips the check; download proceeds as today |
| `filesizeApprox` under-estimates actual download (yt-dlp approximation can be off) | Acceptable — the limit is a guard against runaway usage, not a precise byte cap. Future: add `--max-filesize` yt-dlp flag for hard in-transfer cut |
| `DOWNLOAD_MAX_SIZE_BYTES=0` or negative | `parsePositiveIntOrDefault` clamps to default 5GB |
| `DOWNLOAD_MAX_SIZE_BYTES` set to very large value | Allowed; operator's intent |
| `config` import introduces a circular dependency in `youTubeDownloadService.ts` | No circular risk — `config.ts` imports only `dotenv/config` and `path`; it does not import any service |
| Test flakiness if `DOWNLOAD_MAX_SIZE_BYTES` env var is set externally during test runs | Mock `config` module in the download service test file to pin the limit to a known value |

## Validation

### Automated Checks

```bash
cd backend && npx tsc --noEmit
cd backend && npx jest --no-coverage --testPathPattern="config\.test"
cd backend && npx jest --no-coverage --testPathPattern="youTubeDownloadService\.test"
cd backend && npx eslint src/
```

Or using the Makefile:

```bash
make lint
make test
```

### Manual Verification

1. Set `DOWNLOAD_MAX_SIZE_BYTES=1` in `backend/.env`, restart backend, attempt a download — should immediately return error with "exceeds maximum allowed size"
2. Remove `DOWNLOAD_MAX_SIZE_BYTES` — default 5GB applies, normal downloads proceed
3. Test with a live stream URL — `filesizeApprox` absent, download proceeds without error

## Scope Boundaries

**IN SCOPE:**

- New `downloadMaxSizeBytes` config field with env var `DOWNLOAD_MAX_SIZE_BYTES`, default 5GB
- Pre-download size check in `youTubeDownloadService.ts` using `metadata.filesizeApprox`
- Error message surfaceable by admin UI: `"Download size (Xmb) exceeds maximum allowed size of YMB"`
- HTTP 400 response code (client-correctable condition)
- `.env.example`, README, DEPLOYMENT.md documentation updates
- Unit tests covering all three AC scenarios

**OUT OF SCOPE (do not touch):**

- Do NOT add `--max-filesize` to yt-dlp flags (hard mid-transfer cut is a separate enhancement)
- Do NOT add the check to `queueScheduler.ts` or route layer — metadata is only available inside `downloadVideo()`
- Do NOT modify `youTubeFileDownloader.ts`
- Do NOT implement per-file limits (subtitles, thumbnails individually)
- Do NOT add live in-transfer size tracking
- Do NOT fix the pre-existing `VIDEO_MAX_AGE_DAYS` missing from README (different PR)
- Do NOT remove the aspirational `YOUTUBE_DL_FORMAT` / `DOWNLOAD_TIMEOUT` from DEPLOYMENT.md

## Metadata

- **Investigated by**: issue-resolution-workflow
- **Timestamp**: 2026-06-22T00:00:00Z
- **Artifact**: `.agents/issues/issue-348.md`
