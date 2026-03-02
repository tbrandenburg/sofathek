# Investigation: Backend has 0% test coverage - implement comprehensive test suite

**Issue**: #7 (https://github.com/tbrandenburg/sofathek/issues/7)
**Type**: CHORE
**Investigated**: 2026-03-02T10:00:00Z

### Assessment

| Metric     | Value  | Reasoning                                                                                                           |
| ---------- | ------ | ------------------------------------------------------------------------------------------------------------------- |
| Priority   | HIGH   | Missing test coverage for production-ready backend blocks deployment and creates significant risk for maintenance   |
| Complexity | HIGH   | 14 backend files need comprehensive testing, multiple external dependencies requiring mocking, integration tests    |
| Confidence | HIGH   | Clear scope defined in issue, well-structured codebase with existing Jest dependencies, frontend patterns to follow |

---

## Problem Statement

The backend has 0% test coverage despite having Jest and testing dependencies configured. This creates deployment risk and prevents safe refactoring of critical video streaming and YouTube download functionality.

---

## Analysis

### Root Cause / Change Rationale

Backend development focused on feature implementation without establishing proper testing infrastructure, despite having all testing dependencies available.

### Evidence Chain

WHY: Backend has 0% test coverage
↓ BECAUSE: No Jest test files exist (*.test.ts or *.spec.ts)
Evidence: `backend/src/` contains 14 files but zero test files

↓ BECAUSE: Jest configuration is incomplete  
Evidence: `package.json:13` - `"test": "jest --passWithNoTests"` configured but no `jest.config.js` exists

↓ ROOT CAUSE: Missing Jest configuration and test directory structure
Evidence: All testing dependencies installed (`jest`, `ts-jest`, `supertest`, `@types/jest`) but not properly configured

### Affected Files

| File                                  | Lines | Action | Description                    |
| ------------------------------------- | ----- | ------ | ------------------------------ |
| `backend/jest.config.js`              | NEW   | CREATE | Jest configuration for backend |
| `backend/src/__tests__/setup.ts`      | NEW   | CREATE | Test environment setup         |
| `backend/src/__tests__/unit/`         | NEW   | CREATE | Unit test directory            |
| `backend/src/__tests__/integration/`  | NEW   | CREATE | Integration test directory     |
| 14 test files for backend modules     | NEW   | CREATE | Comprehensive test coverage    |

### Integration Points

- `backend/src/services/videoService.ts:26` - File system operations need mocking
- `backend/src/services/youTubeDownloadService.ts:` - External YouTube API calls need mocking
- `backend/src/services/thumbnailService.ts:` - FFmpeg operations need mocking
- `backend/src/routes/*.ts` - HTTP endpoints need supertest integration testing
- `backend/src/middleware/errorHandler.ts:7` - Error handling patterns need validation

### Git History

- **Backend created**: No specific test-related commits found
- **Dependencies added**: Jest ecosystem already configured in package.json
- **Implication**: Testing infrastructure available but never implemented

---

## Implementation Plan

### Step 1: Create Jest Configuration

**File**: `backend/jest.config.js`
**Action**: CREATE

**Required configuration:**

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/*.test.ts',
    '**/*.spec.ts'
  ],
  transform: {
    '^.+\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/test-*.ts', // Exclude manual test files
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testTimeout: 10000
};
```

**Why**: Configures Jest for TypeScript with coverage reporting targeting 40%+ coverage

---

### Step 2: Create Test Setup Infrastructure

**File**: `backend/src/__tests__/setup.ts`
**Action**: CREATE

**Required setup:**

```typescript
import { jest } from '@jest/globals';

// Mock external dependencies globally
jest.mock('fs/promises', () => ({
  readdir: jest.fn(),
  stat: jest.fn(),
  access: jest.fn(),
  writeFile: jest.fn(),
  readFile: jest.fn(),
}));

jest.mock('youtube-dl-exec', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('ffmpeggy', () => ({
  ffmpeg: jest.fn(),
}));

// Console suppression for cleaner test output
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
```

**Why**: Provides consistent mocking setup for external dependencies across all tests

---

### Step 3: Create VideoService Unit Tests

**File**: `backend/src/__tests__/unit/services/videoService.test.ts`
**Action**: CREATE

**Test cases to implement:**

```typescript
import { VideoService } from '../../../services/videoService';
import { promises as fs } from 'fs';
import path from 'path';

// Mock fs promises
const mockFs = fs as jest.Mocked<typeof fs>;

describe('VideoService', () => {
  let videoService: VideoService;
  const testVideosDir = '/test/videos';

  beforeEach(() => {
    videoService = new VideoService(testVideosDir);
    jest.clearAllMocks();
  });

  describe('scanVideoDirectory', () => {
    it('should scan directory and return video files', async () => {
      // Mock directory contents
      mockFs.readdir.mockResolvedValue(['video1.mp4', 'video2.avi', 'readme.txt'] as any);
      mockFs.stat.mockImplementation((filePath) => {
        return Promise.resolve({ 
          isDirectory: () => false, 
          size: 1000000 
        } as any);
      });

      const result = await videoService.scanVideoDirectory();

      expect(result.videos).toHaveLength(2);
      expect(result.totalSize).toBeGreaterThan(0);
      expect(result.errors).toEqual([]);
    });

    it('should handle directory access errors gracefully', async () => {
      mockFs.readdir.mockRejectedValue(new Error('Permission denied'));

      const result = await videoService.scanVideoDirectory();

      expect(result.videos).toEqual([]);
      expect(result.errors).toContain('Failed to scan directory: Permission denied');
    });
  });

  describe('validateVideoFile', () => {
    it('should return true for supported video extensions', () => {
      expect(videoService.isVideoFile('test.mp4')).toBe(true);
      expect(videoService.isVideoFile('test.avi')).toBe(true);
      expect(videoService.isVideoFile('test.mkv')).toBe(true);
    });

    it('should return false for unsupported extensions', () => {
      expect(videoService.isVideoFile('test.txt')).toBe(false);
      expect(videoService.isVideoFile('test.pdf')).toBe(false);
    });
  });
});
```

**Why**: Tests core video scanning logic with mocked file system operations

---

### Step 4: Create YouTubeDownloadService Unit Tests

**File**: `backend/src/__tests__/unit/services/youTubeDownloadService.test.ts`
**Action**: CREATE

**Test cases to implement:**

```typescript
import { YouTubeDownloadService } from '../../../services/youTubeDownloadService';
import youtubeDl from 'youtube-dl-exec';

// Mock youtube-dl-exec
const mockYoutubeDl = youtubeDl as jest.MockedFunction<typeof youtubeDl>;

describe('YouTubeDownloadService', () => {
  let service: YouTubeDownloadService;

  beforeEach(() => {
    service = new YouTubeDownloadService('/test/downloads');
    jest.clearAllMocks();
  });

  describe('validateYouTubeUrl', () => {
    it('should validate correct YouTube URLs', () => {
      expect(service.validateYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
      expect(service.validateYouTubeUrl('https://youtu.be/dQw4w9WgXcQ')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(service.validateYouTubeUrl('https://example.com')).toBe(false);
      expect(service.validateYouTubeUrl('not-a-url')).toBe(false);
    });
  });

  describe('downloadVideo', () => {
    it('should successfully download video', async () => {
      mockYoutubeDl.mockResolvedValue({} as any);

      const result = await service.downloadVideo('https://youtu.be/test', 'test-video');

      expect(mockYoutubeDl).toHaveBeenCalledWith(
        'https://youtu.be/test',
        expect.objectContaining({
          output: expect.stringContaining('test-video.%(ext)s')
        })
      );
    });

    it('should handle download errors', async () => {
      mockYoutubeDl.mockRejectedValue(new Error('Download failed'));

      await expect(
        service.downloadVideo('https://youtu.be/test', 'test')
      ).rejects.toThrow('Download failed');
    });
  });
});
```

**Why**: Tests YouTube URL validation and download logic with mocked youtube-dl-exec

---

### Step 5: Create API Route Integration Tests

**File**: `backend/src/__tests__/integration/routes/api.test.ts`
**Action**: CREATE

**Test cases to implement:**

```typescript
import request from 'supertest';
import express from 'express';
import { apiRouter } from '../../../routes/api';
import { VideoService } from '../../../services/videoService';

// Mock VideoService
jest.mock('../../../services/videoService');

describe('API Routes', () => {
  let app: express.Application;
  let mockVideoService: jest.Mocked<VideoService>;

  beforeEach(() => {
    app = express();
    app.use('/api', apiRouter);
    mockVideoService = new VideoService('') as jest.Mocked<VideoService>;
  });

  describe('GET /api/videos', () => {
    it('should return list of videos', async () => {
      const mockVideos = [
        { id: 'test1', filename: 'video1.mp4', title: 'Test Video 1' }
      ];
      mockVideoService.scanVideoDirectory.mockResolvedValue({
        videos: mockVideos,
        totalSize: 1000000,
        errors: []
      });

      const response = await request(app)
        .get('/api/videos')
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.videos).toEqual(mockVideos);
    });

    it('should handle video service errors', async () => {
      mockVideoService.scanVideoDirectory.mockRejectedValue(new Error('Service error'));

      const response = await request(app)
        .get('/api/videos')
        .expect(500);

      expect(response.body.status).toBe('error');
    });
  });

  describe('GET /api/stream/:filename', () => {
    it('should stream video file with Range support', async () => {
      // Test HTTP Range requests for video streaming
      const response = await request(app)
        .get('/api/stream/test.mp4')
        .set('Range', 'bytes=0-1023')
        .expect(206);

      expect(response.headers['content-range']).toBeDefined();
      expect(response.headers['accept-ranges']).toBe('bytes');
    });
  });
});
```

**Why**: Tests API endpoints with supertest including HTTP Range requests for video streaming

---

### Step 6: Create Error Handler Tests

**File**: `backend/src/__tests__/unit/middleware/errorHandler.test.ts`
**Action**: CREATE

**Test cases to implement:**

```typescript
import { Request, Response, NextFunction } from 'express';
import { AppError, globalErrorHandler } from '../../../middleware/errorHandler';

describe('Error Handler', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  describe('AppError', () => {
    it('should create AppError with correct properties', () => {
      const error = new AppError('Test error', 400);
      
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(400);
      expect(error.isOperational).toBe(true);
    });
  });

  describe('globalErrorHandler', () => {
    it('should handle AppError correctly', () => {
      const error = new AppError('Custom error', 404);

      globalErrorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          message: 'Custom error'
        })
      );
    });

    it('should handle generic errors', () => {
      const error = new Error('Generic error');

      globalErrorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });
});
```

**Why**: Tests custom error handling and Express middleware error patterns

---

### Step 7: Create Remaining Service Tests

**Files**: 
- `backend/src/__tests__/unit/services/downloadQueueService.test.ts`
- `backend/src/__tests__/unit/services/thumbnailService.test.ts`
- `backend/src/__tests__/unit/utils/logger.test.ts`

**Action**: CREATE

**Pattern**: Follow VideoService test structure with appropriate mocking for each service's external dependencies (file system for queue persistence, FFmpeg for thumbnails, Winston for logging)

---

### Step 8: Create Health Check Integration Tests

**File**: `backend/src/__tests__/integration/routes/health.test.ts`
**Action**: CREATE

**Test cases**: Health endpoint system monitoring functionality with mocked system calls

---

### Step 9: Update package.json Scripts

**File**: `backend/package.json`
**Lines**: 13-15
**Action**: UPDATE

**Current scripts:**
```json
"test": "jest --passWithNoTests",
"test:watch": "jest --watch",
"test:coverage": "jest --coverage --passWithNoTests"
```

**Updated scripts:**
```json
"test": "jest",
"test:watch": "jest --watch",
"test:coverage": "jest --coverage --coverageThreshold='{\"global\":{\"branches\":40,\"functions\":40,\"lines\":40,\"statements\":40}}'",
"test:unit": "jest src/__tests__/unit",
"test:integration": "jest src/__tests__/integration"
```

**Why**: Remove --passWithNoTests flag and add coverage thresholds to enforce 40% minimum coverage

---

## Patterns to Follow

**From codebase - mirror these exactly:**

```typescript
// SOURCE: backend/src/services/videoService.ts:26-50
// Pattern for async service methods with error handling
export class VideoService {
  async scanVideoDirectory(): Promise<VideoScanResult> {
    const errors: string[] = [];
    const videos: Video[] = [];
    let totalSize = 0;

    try {
      // Main operation logic
      const files = await fs.readdir(this.videosDirectory);
      // ... processing ...
      
      return { videos, totalSize, errors };
    } catch (error) {
      errors.push(`Failed to scan directory: ${error.message}`);
      return { videos: [], totalSize: 0, errors };
    }
  }
}
```

```typescript
// SOURCE: backend/src/middleware/errorHandler.ts:7-19
// Pattern for custom error classes
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}
```

```typescript
// SOURCE: backend/package.json:30-46
// Pattern for test dependencies - already available
{
  "@types/jest": "^29.5.0",
  "@types/supertest": "^2.0.12", 
  "jest": "^29.5.0",
  "supertest": "^6.3.3",
  "ts-jest": "^29.1.0"
}
```

---

## Edge Cases & Risks

| Risk/Edge Case                       | Mitigation                                      |
| ------------------------------------ | ----------------------------------------------- |
| File system permissions in tests     | Use proper mocking, avoid real file operations |
| YouTube API rate limits              | Mock all external API calls completely         |
| FFmpeg not available in CI           | Mock ffmpeggy module entirely                   |
| Test timeout for large operations    | Set testTimeout: 10000ms in Jest config        |
| Coverage calculation issues          | Use collectCoverageFrom to exclude test files  |

---

## Validation

### Automated Checks

```bash
npm test                    # Run all tests
npm run test:coverage       # Generate coverage report (target: 40%+)
npm run type-check          # TypeScript validation
npm run lint                # ESLint validation
```

### Manual Verification

1. Verify test coverage reaches 40%+ for backend (check coverage/lcov-report/index.html)
2. Ensure all existing functionality still works (no regressions)
3. Confirm CI pipeline passes with new tests
4. Validate each service class has comprehensive unit tests
5. Check API endpoints have integration test coverage

---

## Scope Boundaries

**IN SCOPE:**

- Jest configuration and test infrastructure setup
- Unit tests for all service classes (VideoService, YouTubeDownloadService, DownloadQueueService, ThumbnailService)
- Integration tests for API endpoints (/api/videos, /api/stream, /health, /youtube routes)
- Error handler and utility function tests
- Achieving 40%+ backend test coverage

**OUT OF SCOPE (do not touch):**

- Existing business logic implementation (no code changes)
- Frontend test structure (already at 49.87% coverage)
- Production deployment configuration
- Manual test-*.ts files (keep as reference/tools)
- Performance optimization (focus only on coverage)

---

## Metadata

- **Investigated by**: Claude
- **Timestamp**: 2026-03-02T10:00:00Z
- **Artifact**: `.claude/PRPs/issues/issue-7.md`