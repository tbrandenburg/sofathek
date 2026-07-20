# Investigation: Add global content policy settings for blocking videos before download

**Issue**: #355 (https://github.com/tbrandenburg/sofathek/issues/355)
**Type**: ENHANCEMENT
**Investigated**: 2026-07-20T15:27:51Z

### Assessment

| Metric     | Value  | Reasoning                                                                                                                     |
| ---------- | ------ | ------------------------------------------------------------------------------------------------------------------------------ |
| Priority   | MEDIUM | Not blocking other work and no evidence of repeated user requests, but it's a well-scoped, high-value safety/content-control feature. |
| Complexity | MEDIUM | Touches 4-5 existing files plus 2-3 new files, with two integration points (route preflight + queue worker), but follows an existing established precedent (the `downloadMaxSizeBytes` check) rather than introducing new architecture. |
| Confidence | HIGH   | The exact insertion points, error class, config patterns, and a near-identical prior commit (`6e85a85`) implementing a metadata-based rejection are all present and unambiguous in the codebase. |

## Problem Statement

Sofathek currently has no way to block videos from being downloaded based on their YouTube metadata (tags, categories, title/description/uploader text). Users want a project-local, backend-only settings file (`.sofathek/settings.json`) that defines a `contentPolicy` (blocked tags, categories, and free-text terms) so that unwanted content (e.g. gaming videos) is rejected with a clear HTTP `422` response before any download starts, and cannot be bypassed by directly queuing a download.

## Analysis

### Root Cause / Change Rationale

This is a net-new feature; there is no existing content-filtering mechanism. The nearest existing precedent is the download-size guard added in commit `6e85a85` (`feat: add configurable total download size limit`), which established the exact pattern to mirror: a config-driven, metadata-based rejection inserted into `YouTubeDownloadService.downloadVideo()` immediately after `metadataExtractor.extract()`, throwing an `AppError` before the actual file transfer (`this.fileDownloader.download(...)`) is invoked.

Two things are new and must be introduced for this issue:
1. **JSON-file-based settings loading** - no existing pattern loads arbitrary JSON config from disk (env vars only, see `config.ts`). This must be built following the same "validate at startup, throw on invalid, treat missing as default" idiom already used by `validateDir()` in `config.ts:42-46` and `config.ts:85-87`.
2. **Preflight-then-reuse-in-queue metadata flow** - today the route (`routes/youtube.ts`) never fetches metadata; only the queue worker (via `youTubeDownloadService.downloadVideo()`) does. The issue explicitly requires enforcing the policy in the queue worker AND allowing an optional route-level preflight that reuses the same metadata (avoid fetching twice).

### Evidence Chain

```
REQUIREMENT: Reject a video based on YouTube metadata before download starts, with HTTP 422 + stable code.

Nearest existing precedent: metadata-based size rejection.
Evidence: backend/src/services/youTubeDownloadService.ts:66-73
  if (metadata.filesizeApprox != null && metadata.filesizeApprox > config.downloadMaxSizeBytes) {
    ...
    throw new AppError(
      `Download size (${sizeMB}MB) exceeds maximum allowed size of ${limitMB}MB`,
      400
    );
  }

↓ This check runs AFTER metadata extraction (line 58) and BEFORE file download (line 75) -
  exactly where a content-policy check must run too.

↓ AppError already supports a stable `code` string (4th constructor arg), surfaced to the
  HTTP JSON response body.
Evidence: backend/src/middleware/errorHandler.ts:7-21, 67-75
  constructor(message: string, statusCode: number = 500, isOperational: boolean = true, code?: string)
  ...
  ...(err.code !== undefined && { code: err.code }),

↓ No JSON-settings-file loader exists yet; config.ts only reads env vars and validates
  synchronously at import time.
Evidence: backend/src/config.ts:60-87 (getConfig() + validateDir() called at module load)

↓ Queue items only store a free-text `.error` string, no stable `.errorCode` - if the
  policy is enforced inside the queue worker (via downloadVideo()), the AppError's `code`
  would be silently dropped unless propagated explicitly.
Evidence: backend/src/services/youTubeDownloadService.ts:150-166 (catch block only keeps `errorMessage`)
Evidence: backend/src/types/youtube.ts:104-121 (DownloadResult has no errorCode field)
Evidence: backend/src/services/queueScheduler.ts:129-138 (item.error = result.error, no code)

ROOT CAUSE (of the gap): There is (a) no settings-file loader/validator, (b) no content-policy
evaluation function, (c) no error-code propagation path from AppError -> DownloadResult -> QueueItem,
and (d) no route-level preflight metadata fetch. All four must be added.
```

### Affected Files

| File                                                     | Lines   | Action | Description                                                                                   |
| --------------------------------------------------------- | ------- | ------ | ----------------------------------------------------------------------------------------------- |
| `backend/src/types/contentPolicy.ts`                       | NEW     | CREATE | Zod schema + TS types for `ContentPolicySettings` and `ContentPolicyViolation`                  |
| `backend/src/services/contentPolicyConfig.ts`              | NEW     | CREATE | Loads/validates `.sofathek/settings.json` from disk at startup (sync, like `config.ts`)          |
| `backend/src/services/contentPolicyService.ts`             | NEW     | CREATE | `ContentPolicyService.evaluate(metadata): ContentPolicyViolation \| null`                        |
| `backend/src/config.ts`                                   | 1-87    | UPDATE | Add `SOFATHEK_CONFIG_DIR` resolution helper used by `contentPolicyConfig.ts`                     |
| `backend/src/types/youtube.ts`                             | 4-13, 104-121, 126-147 | UPDATE | Add `metadata?: YouTubeMetadata` to `DownloadRequest`; add `errorCode?: string` to `DownloadResult` and `QueueItem` |
| `backend/src/middleware/errorHandler.ts`                   | -       | NO CHANGE | `AppError` already supports `code`; reuse as-is                                               |
| `backend/src/services/youTubeDownloadService.ts`           | 19-75, 150-166 | UPDATE | Inject `ContentPolicyService`; reuse pre-fetched metadata if present; evaluate policy after extraction; propagate `errorCode` on failure |
| `backend/src/services/index.ts`                            | 1-20    | UPDATE | Construct `ContentPolicyService` (from `contentPolicyConfig`) and pass into `YouTubeDownloadService` |
| `backend/src/routes/youtube.ts`                             | 23-62   | UPDATE | Add metadata preflight + policy check before `addToQueue()`; attach fetched metadata to `DownloadRequest`; throw `422 VIDEO_BLOCKED_BY_POLICY` on violation |
| `backend/src/services/queueScheduler.ts`                    | 129-138 | UPDATE | Propagate `result.errorCode` into `item.errorCode` on failure                                   |
| `backend/.env.example`                                     | append  | UPDATE | Document `SOFATHEK_CONFIG_DIR` override                                                          |
| `README.md`                                                | ~188-215 | UPDATE | Document `SOFATHEK_CONFIG_DIR` env var and `.sofathek/settings.json` schema                       |
| `backend/src/__tests__/unit/services/contentPolicyService.test.ts` | NEW | CREATE | Unit tests: blocked tag/category/term, allowed, missing settings, malformed settings |
| `backend/src/__tests__/unit/services/youTubeDownloadService.test.ts` | existing | UPDATE | Add tests for policy rejection path + errorCode propagation |
| `backend/src/__tests__/integration/routes/youtube.test.ts`  | existing | UPDATE | Add test for `422` response with `code: VIDEO_BLOCKED_BY_POLICY`                                 |

### Integration Points

- `backend/src/services/index.ts:16-19` constructs all services as singletons - `ContentPolicyService` must be constructed here (loading `contentPolicyConfig` once) and injected into `YouTubeDownloadService`'s constructor (currently 3 args: `videosDirectory, tempDirectory, thumbnailService` at `youTubeDownloadService.ts:26-30`).
- `backend/src/routes/youtube.ts:33-36` is the only place today that calls into `youTubeDownloadService` before `addToQueue()` - the metadata preflight + policy check must be added here, reusing `youTubeDownloadService`'s metadata extractor (expose a new public method, e.g. `fetchMetadataAndCheckPolicy(url)`, rather than reaching into the private `metadataExtractor` field).
- `backend/src/services/queueScheduler.ts:105` calls `youtubeDownloadService.downloadVideo(item.request, ...)` - `item.request` is the `DownloadRequest` built in the route; if the route attaches `metadata` to it, `downloadVideo()` must check for and reuse it instead of calling `metadataExtractor.extract()` again.
- `backend/src/services/downloadQueueService.ts` (not fully read, but referenced by `services/index.ts:19`) constructs `QueueItem` from `DownloadRequest` - since `DownloadRequest` gains an optional `metadata` field, this file does not need functional changes (it copies `request` verbatim into the item, per pattern implied by `queueScheduler.ts:42,105` accessing `item.request`), but should be scanned during implementation to confirm no persistence sanitation logic strips the field unexpectedly.

### Git History

- **Introduced**: N/A - this is a new feature with no prior implementation.
- **Closest precedent**: `6e85a85` - "feat: add configurable total download size limit (default 5GB) (#348) (#351)" - added `downloadMaxSizeBytes` to `Config`, a metadata-based check in `downloadVideo()`, and matching env var / README / tests. This PR is the template to follow structurally.
- **Implication**: No regression; purely additive. Follow the same commit shape: config field(s)/loader -> metadata check -> `AppError` -> tests -> docs.

## Implementation Plan

### Step 1: Define content policy types and schema

**File**: `backend/src/types/contentPolicy.ts`
**Action**: CREATE

```typescript
import { z } from 'zod';

/**
 * Schema for `.sofathek/settings.json` `contentPolicy` section.
 * All fields optional; a missing settings file or missing contentPolicy
 * section is treated as an empty/default (non-blocking) policy.
 */
export const ContentPolicySchema = z.object({
  blockedTags: z.array(z.string()).default([]),
  blockedCategories: z.array(z.string()).default([]),
  blockedTerms: z.array(z.string()).default([]),
  message: z.string().default('This video was blocked by the configured content policy.'),
}).strict();

export const SettingsFileSchema = z.object({
  contentPolicy: ContentPolicySchema.optional(),
}).passthrough();

export type ContentPolicy = z.infer<typeof ContentPolicySchema>;

export interface ContentPolicyViolation {
  /** Which policy rule was violated */
  reason: 'blockedTag' | 'blockedCategory' | 'blockedTerm';
  /** The specific matched value */
  matched: string;
  /** User-facing message from settings */
  message: string;
}
```

**Why**: Establishes the exact runtime shape for validation (mirrors `YtDlpResponseSchema` in `backend/src/utils/validation.ts:3-56`, the only existing zod-schema convention in the backend) and gives `.strict()`/`.passthrough()` semantics matching the acceptance criteria ("Invalid JSON or invalid policy values produce a clear startup configuration error" via `.strict()` on `contentPolicy`, while allowing future top-level settings keys via `.passthrough()` on the root).

### Step 2: Load and validate `.sofathek/settings.json` at startup

**File**: `backend/src/services/contentPolicyConfig.ts`
**Action**: CREATE

```typescript
import * as fs from 'fs';
import * as path from 'path';
import { ContentPolicy, ContentPolicySchema, SettingsFileSchema } from '../types/contentPolicy';

const DEFAULT_POLICY: ContentPolicy = ContentPolicySchema.parse({});

function resolveConfigDir(): string {
  return process.env.SOFATHEK_CONFIG_DIR || process.cwd();
}

function loadSettingsFile(): unknown {
  const settingsPath = path.join(resolveConfigDir(), '.sofathek', 'settings.json');

  if (!fs.existsSync(settingsPath)) {
    return {};
  }

  let raw: string;
  try {
    raw = fs.readFileSync(settingsPath, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to read content policy settings at ${settingsPath}: ${(error as Error).message}`);
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`Invalid JSON in content policy settings at ${settingsPath}: ${(error as Error).message}`);
  }
}

function loadContentPolicy(): ContentPolicy {
  const rawSettings = loadSettingsFile();
  const result = SettingsFileSchema.safeParse(rawSettings);

  if (!result.success) {
    throw new Error(`Invalid content policy settings: ${result.error.message}`);
  }

  return result.data.contentPolicy ?? DEFAULT_POLICY;
}

export const contentPolicy: ContentPolicy = loadContentPolicy();
```

**Why**: Mirrors the existing `config.ts` idiom exactly - module-level singleton computed and validated eagerly at import time (`config.ts:83-87`), throwing a plain `Error` on invalid config so the process fails fast at startup (per acceptance criteria: "Invalid JSON or invalid policy values produce a clear startup configuration error"). Missing file -> `{}` -> validated to `DEFAULT_POLICY` (per: "Treat a missing settings file as an empty/default policy"). `SOFATHEK_CONFIG_DIR` env var supports the Docker/production override requirement. Uses synchronous `fs` (not `fs/promises`) because this must resolve before any request is served, matching `config.ts`'s synchronous, top-level style (no async top-level code exists in `config.ts`).

### Step 3: Implement the policy evaluator service

**File**: `backend/src/services/contentPolicyService.ts`
**Action**: CREATE

```typescript
import { ContentPolicy, ContentPolicyViolation } from '../types/contentPolicy';
import { YouTubeMetadata } from '../types/youtube';

export class ContentPolicyService {
  constructor(private readonly policy: ContentPolicy) {}

  evaluate(metadata: YouTubeMetadata): ContentPolicyViolation | null {
    const { blockedTags, blockedCategories, blockedTerms, message } = this.policy;

    const tags = (metadata.tags ?? []).map((t) => t.toLowerCase());
    const categories = (metadata.categories ?? []).map((c) => c.toLowerCase());

    for (const blockedTag of blockedTags) {
      if (tags.includes(blockedTag.toLowerCase())) {
        return { reason: 'blockedTag', matched: blockedTag, message };
      }
    }

    for (const blockedCategory of blockedCategories) {
      if (categories.includes(blockedCategory.toLowerCase())) {
        return { reason: 'blockedCategory', matched: blockedCategory, message };
      }
    }

    if (blockedTerms.length > 0) {
      const haystack = [
        metadata.title,
        metadata.description,
        metadata.uploader,
        ...(metadata.tags ?? []),
        ...(metadata.categories ?? []),
      ]
        .filter((value): value is string => typeof value === 'string')
        .join('\n')
        .toLowerCase();

      for (const term of blockedTerms) {
        if (haystack.includes(term.toLowerCase())) {
          return { reason: 'blockedTerm', matched: term, message };
        }
      }
    }

    return null;
  }
}
```

**Why**: Pure, dependency-injected class (matches existing composed-service pattern in `YouTubeDownloadService`'s constructor, `youTubeDownloadService.ts:26-36`). Implements every acceptance criterion in order of the requirements list: exact case-insensitive tag match, exact case-insensitive category match, then substring case-insensitive term match against title, description, uploader, tags, and categories (issue explicitly lists these five fields).

### Step 4: Add a startup config-dir helper (optional but keeps precedent consistent)

**File**: `backend/src/config.ts`
**Lines**: no functional change required - `contentPolicyConfig.ts` reads `process.env.SOFATHEK_CONFIG_DIR` directly (Step 2). Do **not** add `contentPolicy` fields into `config.ts`'s `Config` interface, since that config is env-var-only by established convention (see `utils/validation.ts` vs `config.ts` split noted in codebase exploration) and the policy is file-based, not env-based, per the issue's explicit design.

**Why**: Keeps `config.ts` scope unchanged (env vars only) and avoids conflating two different configuration sources; `contentPolicyConfig.ts` is a self-contained module following the same eager-validation idiom.

### Step 5: Extend types for metadata reuse and error-code propagation

**File**: `backend/src/types/youtube.ts`

**Current code (lines 4-13):**
```typescript
export interface DownloadRequest {
  /** Video URL (YouTube, Vimeo, Twitter/X, and 1000+ other sites supported) */
  url: string;
  /** Optional custom title override */
  title?: string;
  /** Request timestamp */
  requestedAt: Date;
  /** Unique request identifier */
  requestId: string;
}
```

**Required change:**
```typescript
export interface DownloadRequest {
  /** Video URL (YouTube, Vimeo, Twitter/X, and 1000+ other sites supported) */
  url: string;
  /** Optional custom title override */
  title?: string;
  /** Request timestamp */
  requestedAt: Date;
  /** Unique request identifier */
  requestId: string;
  /**
   * Metadata already fetched during route-level preflight (e.g. content
   * policy check). When present, downloadVideo() reuses it instead of
   * calling the metadata extractor a second time.
   */
  metadata?: YouTubeMetadata;
}
```

**Current code (lines 104-121, `DownloadResult`):**
```typescript
export interface DownloadResult {
  /** Unique download identifier */
  id: string;
  /** Download status */
  status: 'success' | 'error' | 'cancelled';
  /** YouTube metadata */
  metadata?: YouTubeMetadata;
  /** @internal - Local video file path, not exposed via API */
  videoPath?: string;
  /** @internal - Local thumbnail file path, not exposed via API */
  thumbnailPath?: string;
  /** Error message (if failed) */
  error?: string;
  /** Download completion timestamp */
  completedAt: Date;
  /** Download start timestamp */
  startedAt: Date;
}
```

**Required change:** add `errorCode?: string;` immediately after `error?: string;`.

**Current code (lines 126-147, `QueueItem`):** add `errorCode?: string;` immediately after `error?: string;` (line 140).

**Why**: `DownloadRequest.metadata` enables the "reuse preflight metadata in the queue to avoid fetching it twice" requirement. `errorCode` on `DownloadResult`/`QueueItem` closes the propagation gap identified in the evidence chain (Step 8 below) so `GET /api/youtube/download/:id/status` can surface `VIDEO_BLOCKED_BY_POLICY` in `diagnostics` (route file lines 141-148).

### Step 6: Enforce the policy inside `YouTubeDownloadService`

**File**: `backend/src/services/youTubeDownloadService.ts`

**Current code (lines 1-14, imports):**
```typescript
import * as path from 'path';
import * as fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { getErrorMessage } from '../utils/error';
import { DownloadRequest, DownloadResult, YouTubeMetadata } from '../types/youtube';
import { VideoInfoFile } from '../types/video';
import { ThumbnailService } from './thumbnailService';
import { YouTubeUrlValidator } from './youTubeUrlValidator';
import { YouTubeMetadataExtractor } from './youTubeMetadataExtractor';
import { YouTubeFileDownloader, DownloadProgressCallback } from './youTubeFileDownloader';
import { VideoFileManager } from './videoFileManager';
import { AppError } from '../middleware/errorHandler';
import { config } from '../config';
```

**Required change:** add `import { ContentPolicyService } from './contentPolicyService';`.

**Current code (lines 19-36, class + constructor):**
```typescript
export class YouTubeDownloadService {
  private readonly urlValidator: YouTubeUrlValidator;
  private readonly metadataExtractor: YouTubeMetadataExtractor;
  private readonly fileDownloader: YouTubeFileDownloader;
  private readonly fileManager: VideoFileManager;
  private readonly thumbnailService: ThumbnailService;

  constructor(
    videosDirectory: string, 
    tempDirectory: string,
    thumbnailService: ThumbnailService
  ) {
    this.urlValidator = new YouTubeUrlValidator();
    this.metadataExtractor = new YouTubeMetadataExtractor();
    this.fileDownloader = new YouTubeFileDownloader(tempDirectory);
    this.fileManager = new VideoFileManager(videosDirectory, tempDirectory);
    this.thumbnailService = thumbnailService;
  }
```

**Required change:**
```typescript
export class YouTubeDownloadService {
  private readonly urlValidator: YouTubeUrlValidator;
  private readonly metadataExtractor: YouTubeMetadataExtractor;
  private readonly fileDownloader: YouTubeFileDownloader;
  private readonly fileManager: VideoFileManager;
  private readonly thumbnailService: ThumbnailService;
  private readonly contentPolicyService: ContentPolicyService;

  constructor(
    videosDirectory: string, 
    tempDirectory: string,
    thumbnailService: ThumbnailService,
    contentPolicyService: ContentPolicyService
  ) {
    this.urlValidator = new YouTubeUrlValidator();
    this.metadataExtractor = new YouTubeMetadataExtractor();
    this.fileDownloader = new YouTubeFileDownloader(tempDirectory);
    this.fileManager = new VideoFileManager(videosDirectory, tempDirectory);
    this.thumbnailService = thumbnailService;
    this.contentPolicyService = contentPolicyService;
  }

  /**
   * Fetch metadata and evaluate the content policy without downloading.
   * Used by the route layer for preflight rejection; the returned metadata
   * is attached to the DownloadRequest so downloadVideo() can reuse it.
   */
  async fetchMetadataAndCheckPolicy(url: string): Promise<YouTubeMetadata> {
    const metadata = await this.metadataExtractor.extract(url);
    const violation = this.contentPolicyService.evaluate(metadata);
    if (violation) {
      throw new AppError(violation.message, 422, true, 'VIDEO_BLOCKED_BY_POLICY');
    }
    return metadata;
  }
```

**Current code (lines 56-73):**
```typescript
      await this.fileManager.ensureDirectoriesExist();

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
```

**Required change:**
```typescript
      await this.fileManager.ensureDirectoriesExist();

      const metadata = request.metadata ?? await this.metadataExtractor.extract(request.url);
      logger.info('Retrieved video metadata', {
        downloadId,
        videoId: metadata.id,
        title: metadata.title,
        duration: metadata.duration
      });

      const policyViolation = this.contentPolicyService.evaluate(metadata);
      if (policyViolation) {
        throw new AppError(policyViolation.message, 422, true, 'VIDEO_BLOCKED_BY_POLICY');
      }

      if (metadata.filesizeApprox != null && metadata.filesizeApprox > config.downloadMaxSizeBytes) {
        const sizeMB = Math.round(metadata.filesizeApprox / (1024 * 1024));
        const limitMB = Math.round(config.downloadMaxSizeBytes / (1024 * 1024));
        throw new AppError(
          `Download size (${sizeMB}MB) exceeds maximum allowed size of ${limitMB}MB`,
          400
        );
      }
```

**Current code (lines 150-166, catch block):**
```typescript
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      logger.error('YouTube download failed', {
        downloadId,
        url: request.url,
        error: errorMessage,
        duration: Date.now() - startedAt.getTime()
      });

      return {
        id: downloadId,
        status: 'error',
        error: errorMessage,
        completedAt: new Date(),
        startedAt
      };
    }
```

**Required change:**
```typescript
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      const errorCode = error instanceof AppError ? error.code : undefined;
      logger.error('YouTube download failed', {
        downloadId,
        url: request.url,
        error: errorMessage,
        errorCode,
        duration: Date.now() - startedAt.getTime()
      });

      return {
        id: downloadId,
        status: 'error',
        error: errorMessage,
        ...(errorCode && { errorCode }),
        completedAt: new Date(),
        startedAt
      };
    }
```

**Why**: Enforces the policy unconditionally inside `downloadVideo()` so the queue worker (which always calls this method, `queueScheduler.ts:105`) cannot be bypassed, per acceptance criteria "Enforce the policy in the queue worker as well as during request preflight, so queued downloads cannot bypass it." Reusing `request.metadata` avoids the double-fetch called out in the issue's "Suggested implementation." The catch-block change closes the `errorCode` propagation gap identified in the evidence chain.

### Step 7: Wire up the new service in the composition root

**File**: `backend/src/services/index.ts`

**Current code (lines 1-19):**
```typescript
import { YouTubeDownloadService } from './youTubeDownloadService';
import { YouTubeUrlValidator } from './youTubeUrlValidator';
import { YouTubeMetadataExtractor } from './youTubeMetadataExtractor';
import { YouTubeFileDownloader } from './youTubeFileDownloader';
import { VideoFileManager } from './videoFileManager';
import { DownloadQueueService } from './downloadQueueService';
import { ThumbnailService } from './thumbnailService';
import { VideoCleanupService } from './cleanupService';
import { config } from '../config';
import { logger } from '../utils/logger';

// Initialize services with configured directories
export const thumbnailService = new ThumbnailService(config.tempDir);
export const youTubeDownloadService = new YouTubeDownloadService(config.videosDir, config.tempDir, thumbnailService);
```

**Required change:**
```typescript
import { YouTubeDownloadService } from './youTubeDownloadService';
import { YouTubeUrlValidator } from './youTubeUrlValidator';
import { YouTubeMetadataExtractor } from './youTubeMetadataExtractor';
import { YouTubeFileDownloader } from './youTubeFileDownloader';
import { VideoFileManager } from './videoFileManager';
import { DownloadQueueService } from './downloadQueueService';
import { ThumbnailService } from './thumbnailService';
import { VideoCleanupService } from './cleanupService';
import { ContentPolicyService } from './contentPolicyService';
import { contentPolicy } from './contentPolicyConfig';
import { config } from '../config';
import { logger } from '../utils/logger';

// Initialize services with configured directories
export const thumbnailService = new ThumbnailService(config.tempDir);
export const contentPolicyService = new ContentPolicyService(contentPolicy);
export const youTubeDownloadService = new YouTubeDownloadService(
  config.videosDir,
  config.tempDir,
  thumbnailService,
  contentPolicyService
);
```

Also add `ContentPolicyService` to the re-export block at the bottom of the file (lines 27-36) for testability, matching the existing pattern for every other service class.

**Why**: `services/index.ts` is the sole composition root (all services constructed here as singletons per the existing pattern) - this is where the new dependency must be created and injected.

### Step 8: Add route-level preflight check

**File**: `backend/src/routes/youtube.ts`

**Current code (lines 23-47):**
```typescript
router.post('/download', rateLimitMiddleware(downloadRateLimiter), catchAsync(async (req: Request, res: Response) => {
  const { url, title } = req.body;
  
  if (!url) {
    throw new AppError('Video URL is required', 400);
  }

  logger.info('Video download request received', { url, title });

  // Validate URL format
  const isValidUrl = await youTubeDownloadService.validateYouTubeUrl(url);
  if (!isValidUrl) {
    throw new AppError('Invalid video URL format', 400);
  }

  // Create download request
  const downloadRequest: DownloadRequest = {
    url,
    title,
    requestedAt: new Date(),
    requestId: uuidv4()
  };

  // Add to queue
  const queueItem = await downloadQueueService.addToQueue(downloadRequest);
```

**Required change:**
```typescript
router.post('/download', rateLimitMiddleware(downloadRateLimiter), catchAsync(async (req: Request, res: Response) => {
  const { url, title } = req.body;
  
  if (!url) {
    throw new AppError('Video URL is required', 400);
  }

  logger.info('Video download request received', { url, title });

  // Validate URL format
  const isValidUrl = await youTubeDownloadService.validateYouTubeUrl(url);
  if (!isValidUrl) {
    throw new AppError('Invalid video URL format', 400);
  }

  // Preflight: fetch metadata and enforce content policy before queuing,
  // so blocked videos never enter the queue. Metadata is reused by the
  // queue worker to avoid fetching it twice.
  const metadata = await youTubeDownloadService.fetchMetadataAndCheckPolicy(url);

  // Create download request
  const downloadRequest: DownloadRequest = {
    url,
    title,
    requestedAt: new Date(),
    requestId: uuidv4(),
    metadata
  };

  // Add to queue
  const queueItem = await downloadQueueService.addToQueue(downloadRequest);
```

**Why**: `fetchMetadataAndCheckPolicy()` throws `AppError(message, 422, true, 'VIDEO_BLOCKED_BY_POLICY')` (Step 6), which `catchAsync` (imported at line 4) forwards to `globalErrorHandler`, producing the required `422` response with `code` and `message` (per `errorHandler.ts:67-75`). This satisfies "Fetch metadata before the video is downloaded" and "reject blocked videos with HTTP 422... before addToQueue() if immediate feedback is required" while `downloadRequest.metadata` lets the worker skip a second `extract()` call.

### Step 9: Propagate errorCode into the queue item

**File**: `backend/src/services/queueScheduler.ts`

**Current code (lines 129-138):**
```typescript
    } else {
      item.status = 'failed';
      item.error = result.error || 'Download failed';
      item.completedAt = new Date();

      logger.error('Queue item failed', {
        queueItemId: item.id,
        error: item.error
      });
    }
```

**Required change:**
```typescript
    } else {
      item.status = 'failed';
      item.error = result.error || 'Download failed';
      item.errorCode = result.errorCode;
      item.completedAt = new Date();

      logger.error('Queue item failed', {
        queueItemId: item.id,
        error: item.error,
        errorCode: item.errorCode
      });
    }
```

**Why**: "Store the policy failure in the queue item when rejection occurs during worker validation" - closes the propagation path from `AppError.code` -> `DownloadResult.errorCode` (Step 6) -> `QueueItem.errorCode`, so `GET /api/youtube/download/:id/status` can expose it via the existing `diagnostics` block (`routes/youtube.ts:141-148`) without further route changes (the `diagnostics.error` already surfaces `queueItem.error`; optionally add `errorCode: queueItem.errorCode` to that diagnostics object as a follow-up, see Scope Boundaries).

### Step 10: Add/Update Tests

**File**: `backend/src/__tests__/unit/services/contentPolicyService.test.ts`
**Action**: CREATE

```typescript
import { ContentPolicyService } from '../../../services/contentPolicyService';
import { ContentPolicySchema } from '../../../types/contentPolicy';
import { YouTubeMetadata } from '../../../types/youtube';

function metadata(overrides: Partial<YouTubeMetadata> = {}): YouTubeMetadata {
  return { id: 'abc123', title: 'A normal video', ...overrides };
}

describe('ContentPolicyService', () => {
  it('blocks a video with an exact blocked tag (case-insensitive)', () => {
    const policy = ContentPolicySchema.parse({ blockedTags: ['Gaming'] });
    const service = new ContentPolicyService(policy);
    const violation = service.evaluate(metadata({ tags: ['gaming', 'fun'] }));
    expect(violation).toEqual(expect.objectContaining({ reason: 'blockedTag', matched: 'Gaming' }));
  });

  it('blocks a video with an exact blocked category', () => {
    const policy = ContentPolicySchema.parse({ blockedCategories: ['Gaming'] });
    const service = new ContentPolicyService(policy);
    const violation = service.evaluate(metadata({ categories: ['Gaming'] }));
    expect(violation?.reason).toBe('blockedCategory');
  });

  it('blocks a video whose title contains a blocked term', () => {
    const policy = ContentPolicySchema.parse({ blockedTerms: ['minecraft'] });
    const service = new ContentPolicyService(policy);
    const violation = service.evaluate(metadata({ title: 'Epic Minecraft Let\'s Play' }));
    expect(violation?.reason).toBe('blockedTerm');
  });

  it('allows content with no policy match', () => {
    const policy = ContentPolicySchema.parse({ blockedTags: ['gaming'] });
    const service = new ContentPolicyService(policy);
    expect(service.evaluate(metadata({ tags: ['music'] }))).toBeNull();
  });

  it('allows all content when policy is empty (default)', () => {
    const policy = ContentPolicySchema.parse({});
    const service = new ContentPolicyService(policy);
    expect(service.evaluate(metadata({ tags: ['gaming'], categories: ['Gaming'] }))).toBeNull();
  });
});
```

**File**: `backend/src/__tests__/unit/services/contentPolicyConfig.test.ts`
**Action**: CREATE

```typescript
describe('contentPolicyConfig', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('treats a missing settings file as an empty/default policy', () => {
    jest.isolateModules(() => {
      jest.doMock('fs', () => ({ ...jest.requireActual('fs'), existsSync: () => false }));
      const { contentPolicy } = require('../../../services/contentPolicyConfig');
      expect(contentPolicy.blockedTags).toEqual([]);
    });
  });

  it('throws a clear error on invalid JSON', () => {
    jest.isolateModules(() => {
      jest.doMock('fs', () => ({
        ...jest.requireActual('fs'),
        existsSync: () => true,
        readFileSync: () => '{ invalid json',
      }));
      expect(() => require('../../../services/contentPolicyConfig')).toThrow(/Invalid JSON/);
    });
  });

  it('throws a clear error when contentPolicy has invalid types', () => {
    jest.isolateModules(() => {
      jest.doMock('fs', () => ({
        ...jest.requireActual('fs'),
        existsSync: () => true,
        readFileSync: () => JSON.stringify({ contentPolicy: { blockedTags: 'not-an-array' } }),
      }));
      expect(() => require('../../../services/contentPolicyConfig')).toThrow(/Invalid content policy settings/);
    });
  });
});
```

**Update**: `backend/src/__tests__/unit/services/youTubeDownloadService.test.ts` - add a `ContentPolicyService` mock (following the existing `jest.mock('./contentPolicyService').mockImplementation(...)` idiom used for the other composed services at lines 36-61) with an `evaluate` spy; add test cases:
```typescript
describe('content policy enforcement', () => {
  it('rejects with 422 VIDEO_BLOCKED_BY_POLICY when policy evaluate() returns a violation', () => {
    // mockEvaluate.mockReturnValue({ reason: 'blockedTag', matched: 'gaming', message: 'blocked' });
    // expect result.status === 'error', result.errorCode === 'VIDEO_BLOCKED_BY_POLICY'
  });

  it('reuses request.metadata instead of calling metadataExtractor.extract() again when present', () => {
    // pass request.metadata, assert mockExtract not called
  });
});
```

**Update**: `backend/src/__tests__/integration/routes/youtube.test.ts` - add, following the existing `supertest` + mocked `services/index` idiom (lines 8-19, 27-34):
```typescript
it('returns 422 with VIDEO_BLOCKED_BY_POLICY when the preflight check rejects the video', async () => {
  // mock youTubeDownloadService.fetchMetadataAndCheckPolicy to reject with
  // new AppError('This video was blocked...', 422, true, 'VIDEO_BLOCKED_BY_POLICY')
  const response = await request(app).post('/download').send({ url: 'https://youtube.com/watch?v=x' });
  expect(response.status).toBe(422);
  expect(response.body.code).toBe('VIDEO_BLOCKED_BY_POLICY');
});
```

## Patterns to Follow

**From codebase - mirror these exactly:**

```typescript
// SOURCE: backend/src/services/youTubeDownloadService.ts:66-73
// Pattern for a metadata-based rejection that throws a stable, coded AppError
if (metadata.filesizeApprox != null && metadata.filesizeApprox > config.downloadMaxSizeBytes) {
  const sizeMB = Math.round(metadata.filesizeApprox / (1024 * 1024));
  const limitMB = Math.round(config.downloadMaxSizeBytes / (1024 * 1024));
  throw new AppError(
    `Download size (${sizeMB}MB) exceeds maximum allowed size of ${limitMB}MB`,
    400
  );
}
```

```typescript
// SOURCE: backend/src/config.ts:42-46, 85-87
// Pattern for eager, fail-fast startup validation of a config value
function validateDir(dir: string, name: string): void {
  if (!dir || typeof dir !== 'string') {
    throw new Error(`Invalid ${name}: ${dir}`);
  }
}
// ...
export const config = getConfig();
validateDir(config.videosDir, 'VIDEOS_DIR');
```

```typescript
// SOURCE: backend/src/utils/validation.ts:60-66
// Pattern for a zod-based "safeParse or throw with a clear message" validator
export function validateYtDlpResponse(raw: unknown): YtDlpResponse {
  const result = YtDlpResponseSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(`Invalid yt-dlp response: ${result.error.message}`);
  }
  return result.data;
}
```

## Edge Cases & Risks

| Risk/Edge Case                                                                 | Mitigation                                                                                                     |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `.sofathek/settings.json` present but empty `{}`                               | `SettingsFileSchema.passthrough()` + optional `contentPolicy` -> defaults to `DEFAULT_POLICY` (no rejection).   |
| `blockedTags`/`blockedCategories`/`blockedTerms` provided as non-array or wrong element type | `ContentPolicySchema.strict()` + zod array/string typing rejects at startup with a clear message.        |
| Route preflight and queue worker both run `evaluate()` (double check)          | Intentional per acceptance criteria ("queue worker as well as during request preflight") - cheap, pure, synchronous function; negligible cost. |
| `YouTubeMetadataExtractor.extract()` called twice (once in route preflight, once in worker) if `request.metadata` is lost/stripped by queue persistence (`queuePersistence.ts` serializes `QueueItem` to JSON) | Verify during implementation that `queuePersistence.ts` round-trips `request.metadata` through `JSON.stringify`/`parse` without special-casing fields (it currently serializes the whole `QueueItem`, so this should work, but must be confirmed with a test). |
| Direct queue additions that bypass the route (if any exist) | `downloadVideo()`'s own `evaluate()` call (Step 6) is the authoritative enforcement point regardless of how the item reached the queue - this satisfies "queued downloads cannot bypass it." |
| Config file is a project-local path, not deployable via git in production/Docker | `SOFATHEK_CONFIG_DIR` env var override lets operators mount a settings file at a different path without touching the working directory. |
| Zod `.strict()` policy schema silently swallowing typos in field names (e.g. `blockedTag` instead of `blockedTags`) | `.strict()` rejects unknown keys by default in zod, causing a startup error rather than silent misconfiguration - verify this behavior in the config test. |

## Validation

### Automated Checks

```bash
cd backend && npm run type-check
cd backend && npx jest contentPolicy
cd backend && npx jest youTubeDownloadService
cd backend && npx jest --testPathPattern=integration/routes/youtube
cd backend && npm run lint
```

### Manual Verification

1. Create `backend/.sofathek/settings.json` with `{"contentPolicy": {"blockedTags": ["gaming"], "message": "blocked"}}`, start the backend, `POST /api/youtube/download` with a URL known to have the `gaming` tag - expect `422` with `code: "VIDEO_BLOCKED_BY_POLICY"` and `message: "blocked"`, and confirm no file appears in `videosDir`/`tempDir`.
2. Repeat with an allowed video - expect `201` and successful download through to `completed` status via `GET /api/youtube/download/:id/status`.
3. Remove `.sofathek/settings.json` entirely - confirm the backend still starts and all videos are allowed (default policy).
4. Put invalid JSON in `.sofathek/settings.json` - confirm the backend process fails to start with a clear error message in logs.
5. Set `SOFATHEK_CONFIG_DIR` to a different directory containing a settings file and confirm it is loaded from there instead of the project root.

## Scope Boundaries

**IN SCOPE:**
- `.sofathek/settings.json` loading, validation, and `SOFATHEK_CONFIG_DIR` override.
- `ContentPolicyService` with tag/category/term matching against `YouTubeMetadata`.
- Route-level preflight rejection (`422`, `VIDEO_BLOCKED_BY_POLICY`) and queue-worker enforcement.
- Metadata reuse between preflight and worker to avoid double extraction.
- `errorCode` propagation from `AppError` through `DownloadResult` to `QueueItem`.
- Tests for blocked tags, categories, terms, allowed content, missing settings, and malformed settings.

**OUT OF SCOPE (do not touch):**
- Exposing `.sofathek/settings.json` contents or the `contentPolicy` object through any frontend-facing API or route (explicit non-goal in the issue: "Keep settings backend-only and never expose the file through the frontend API").
- A settings-management UI or hot-reload of the policy file while the server is running (the file is read once at startup, matching the existing `config.ts` singleton pattern - hot-reload is a future enhancement, not requested here).
- Adding `errorCode` to the `GET /queue`/`GET /download/:id/status` route's outward-facing JSON transformation beyond what's minimally needed (the `diagnostics.errorCode` field can be added trivially but is not explicitly required by the acceptance criteria, which only require the `POST /download` response to carry the code - implementers may add it for completeness but it is not blocking).
- Any change to `youTubeMetadataExtractor.ts`, `youTubeUrlValidator.ts`, `youTubeFileDownloader.ts`, `videoFileManager.ts`, `thumbnailService.ts`, or `downloadQueueService.ts` internals beyond what's listed above.
- Age-based or other non-issue-355 content controls (e.g. `ageLimit`) - only tags/categories/terms as specified.

## Metadata

- **Investigated by**: issue-resolution-workflow
- **Timestamp**: 2026-07-20T15:27:51Z
- **Artifact**: `.agents/issues/issue-355.md`
</content>
