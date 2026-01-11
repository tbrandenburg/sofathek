---
name: "SOFATHEK Phase 1.1 - Critical Video ID Stability Fix"
description: |
  URGENT: Fix the timestamp-based video ID generation that causes all video links to become invalid on every API call. Implement stable, file-based ID generation using cryptographic hashing to ensure video playback functionality.

## Purpose

Fix the critical blocker preventing video playback in SOFATHEK by replacing unstable timestamp-based ID generation with stable, file-content-based hashing. This is the highest priority issue preventing the media center from functioning.

## Core Principles

1. **Stability First**: Video IDs must remain consistent across application restarts and API calls
2. **Content-Based Identity**: IDs should be derived from immutable file properties, not temporal data
3. **Collision Resistance**: Use cryptographic hashing to prevent ID conflicts
4. **Backward Compatibility**: Maintain existing API contract while fixing the underlying implementation
5. **Zero Downtime**: Fix must not require data migration or user intervention

---

## Goal

Transform the broken video ID generation system from timestamp-based (causes immediate link expiration) to stable file-content-based hashing, enabling reliable video streaming and playback functionality.

## Why

- **BLOCKER FIX**: Current system breaks all video links immediately after generation
- **User Experience**: Users cannot play videos due to 404 errors from unstable IDs
- **API Reliability**: Video streaming endpoints become unusable with changing IDs
- **Development Velocity**: Frontend development blocked by unreliable backend IDs
- **Production Readiness**: System cannot go live with this fundamental instability

## What

A surgical fix to the video ID generation algorithm in the scanner service:

### Current Broken Implementation

```typescript
// BROKEN: Creates new ID on every scan
private generateVideoId(filePath: string): string {
  const fileName = path.basename(filePath, path.extname(filePath));
  const category = this.extractCategory(filePath);
  const timestamp = Date.now(); // ❌ CAUSES INSTABILITY
  return `${category}_${fileName.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}`.toLowerCase();
}
```

### Fixed Stable Implementation

```typescript
// FIXED: Stable IDs based on file content and metadata
private generateVideoId(filePath: string): string {
  const fileName = path.basename(filePath, path.extname(filePath));
  const category = this.extractCategory(filePath);
  const stats = fs.statSync(filePath);

  // Create stable hash from file properties
  const hashInput = `${filePath}_${stats.size}_${stats.mtimeMs}`;
  const hash = crypto.createHash('sha256')
    .update(hashInput)
    .digest('hex')
    .substring(0, 8);

  return `${category}_${fileName.replace(/[^a-zA-Z0-9]/g, '_')}_${hash}`.toLowerCase();
}
```

### Success Criteria

- [ ] Video IDs remain identical across multiple API calls
- [ ] Existing video links continue working after server restart
- [ ] Video streaming endpoints return consistent results
- [ ] Frontend can reliably link to videos without 404 errors
- [ ] Zero breaking changes to API response format
- [ ] ID collision probability < 0.001% for typical media libraries

## All Needed Context

### Current System Analysis

```yaml
# CRITICAL ISSUE - ID Generation in backend/src/services/scanner.ts:319
problem: |
  Every API call to /api/videos triggers a full rescan, generating new IDs with Date.now()
  This makes all video URLs invalid immediately after generation

impact: |
  - Video streaming returns 404 for previously valid IDs
  - Frontend cannot maintain stable video references
  - User bookmarks and resume functionality broken
  - Development and testing severely impacted

evidence: |
  - Line 319: `const timestamp = Date.now();`
  - Line 320: `return ${category}_${fileName.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}`.toLowerCase();`
  - Every /api/videos call rescans all files (lines 144-145, 197-198)
```

### File Dependencies

```yaml
# Files to modify
- file: backend/src/services/scanner.ts
  line: 319-321
  change: Replace timestamp-based ID with content-based hash

- file: backend/src/services/scanner.ts
  line: 1
  change: Add crypto import for hashing

# Files to test
- file: backend/src/routes/videos.ts
  verify: Video streaming endpoints work with stable IDs

- file: tests/playwright/phase1-foundation/infrastructure.spec.ts
  verify: ID stability tests pass
```

### Technical Requirements

```yaml
dependencies:
  - Node.js crypto module (built-in)
  - fs.statSync for file metadata
  - No external dependencies required

compatibility:
  - Maintain existing API response format
  - Preserve video metadata structure
  - Keep current category/filename patterns
  - Ensure frontend compatibility

performance:
  - Hash generation must be < 1ms per file
  - No impact on scan time
  - Memory usage unchanged
```

## Implementation Blueprint

### Task List

```yaml
Task 1.1.1: Import Crypto Module
FILE: backend/src/services/scanner.ts
ACTION: Add crypto import at top of file
CODE: |
  import crypto from 'crypto';

Task 1.1.2: Replace ID Generation Logic
FILE: backend/src/services/scanner.ts
LINES: 315-322
ACTION: Replace generateVideoId method
PATTERN: |
  private generateVideoId(filePath: string): string {
    const fileName = path.basename(filePath, path.extname(filePath));
    const category = this.extractCategory(filePath);

    // Get file stats for stable properties
    const stats = fs.statSync(filePath);

    // Create deterministic hash from file properties
    const hashInput = `${filePath}_${stats.size}_${stats.mtimeMs}`;
    const hash = crypto.createHash('sha256')
      .update(hashInput)
      .digest('hex')
      .substring(0, 8);

    return `${category}_${fileName.replace(/[^a-zA-Z0-9]/g, '_')}_${hash}`.toLowerCase();
  }

Task 1.1.3: Add Error Handling
FILE: backend/src/services/scanner.ts
LINES: 315-322
ACTION: Wrap in try-catch for file access errors
PATTERN: |
  private generateVideoId(filePath: string): string {
    try {
      // ... implementation above
    } catch (error) {
      // Fallback to filename-only hash if file inaccessible
      const fileName = path.basename(filePath, path.extname(filePath));
      const category = this.extractCategory(filePath);
      const fallbackHash = crypto.createHash('sha256')
        .update(filePath)
        .digest('hex')
        .substring(0, 8);

      console.warn(`Using fallback ID for ${filePath}: ${error.message}`);
      return `${category}_${fileName.replace(/[^a-zA-Z0-9]/g, '_')}_${fallbackHash}`.toLowerCase();
    }
  }

Task 1.1.4: Test ID Stability
FILE: backend/src/services/__tests__/scanner.test.ts
ACTION: Create stability test
TEST: |
  describe('Video ID Stability', () => {
    test('generates consistent IDs across multiple calls', async () => {
      const testFile = './tests/fixtures/sample.mp4';

      const id1 = scanner.generateVideoId(testFile);
      const id2 = scanner.generateVideoId(testFile);
      const id3 = scanner.generateVideoId(testFile);

      expect(id1).toBe(id2);
      expect(id2).toBe(id3);
    });

    test('different files generate different IDs', async () => {
      const file1 = './tests/fixtures/sample1.mp4';
      const file2 = './tests/fixtures/sample2.mp4';

      const id1 = scanner.generateVideoId(file1);
      const id2 = scanner.generateVideoId(file2);

      expect(id1).not.toBe(id2);
    });
  });
```

### Validation Steps

```bash
# 1. Syntax Check
npm run type-check

# 2. Unit Tests
npm run test:unit -- scanner

# 3. Integration Test
curl -X GET http://localhost:3001/api/videos
# Note first video ID

curl -X GET http://localhost:3001/api/videos
# Verify same video has identical ID

# 4. Video Streaming Test
VIDEO_ID="<id_from_step_3>"
curl -H "Range: bytes=0-1023" "http://localhost:3001/api/videos/${VIDEO_ID}/stream"
# Should return 206 Partial Content, not 404

# 5. Frontend Integration
# Visit http://localhost:3000/library
# Click on video - should play without 404 error
```

## Known Gotchas & Technical Details

### Hash Input Selection

```typescript
// ✅ GOOD: Includes file path, size, and modification time
const hashInput = `${filePath}_${stats.size}_${stats.mtimeMs}`;

// ❌ BAD: Only filename (collision prone)
const hashInput = fileName;

// ❌ BAD: Including content hash (too slow)
const content = fs.readFileSync(filePath);
const hashInput = crypto.createHash('sha256').update(content).digest('hex');
```

### Backwards Compatibility

```typescript
// ✅ PRESERVE: Category prefix and filename structure
return `${category}_${fileName.replace(/[^a-zA-Z0-9]/g, '_')}_${hash}`.toLowerCase();

// ❌ BREAK: Changing ID format entirely
return hash; // Breaks frontend expectations
```

### Error Handling Edge Cases

```typescript
// Handle files that may be in use or moved
try {
  const stats = fs.statSync(filePath);
  // ... normal flow
} catch (error) {
  if (error.code === 'ENOENT') {
    throw new Error(`Video file not found: ${filePath}`);
  }
  // Use fallback for other errors
  return generateFallbackId(filePath);
}
```

## Validation Loop

### Level 1: Immediate Verification (< 1 minute)

```bash
# Start server
npm run dev

# Test API endpoint
curl -s http://localhost:3001/api/videos | jq '.[0].id'
# Note the ID

# Call again immediately
curl -s http://localhost:3001/api/videos | jq '.[0].id'
# MUST be identical to first call
```

### Level 2: Restart Stability (< 2 minutes)

```bash
# Get video ID
VIDEO_ID=$(curl -s http://localhost:3001/api/videos | jq -r '.[0].id')

# Stop server
pkill -f "node.*3001"

# Restart server
npm run dev

# Test same ID works
curl -s "http://localhost:3001/api/videos/${VIDEO_ID}"
# Should return 200, not 404
```

### Level 3: Streaming Functionality (< 1 minute)

```bash
# Test video streaming with stable ID
VIDEO_ID=$(curl -s http://localhost:3001/api/videos | jq -r '.[0].id')

curl -I -H "Range: bytes=0-1023" "http://localhost:3001/api/videos/${VIDEO_ID}/stream"
# Expected: 206 Partial Content
# Not Expected: 404 Not Found
```

### Level 4: Frontend Integration (< 2 minutes)

1. Open browser to `http://localhost:3000/library`
2. Click on any video thumbnail
3. Verify video player loads without error
4. Check browser network tab for 200 responses, no 404s

## Final Validation Checklist

- [ ] **Import Added**: `import crypto from 'crypto';` at top of scanner.ts
- [ ] **Method Replaced**: `generateVideoId()` uses file-based hash, not timestamp
- [ ] **Error Handling**: Graceful fallbacks for file access errors
- [ ] **Tests Pass**: Unit tests verify ID stability across calls
- [ ] **API Stable**: Multiple API calls return identical video IDs
- [ ] **Streaming Works**: Video streaming endpoints return content, not 404
- [ ] **Frontend Fixed**: Users can click videos and playback starts successfully
- [ ] **No Regressions**: Existing metadata and API format unchanged

---

## Success Metrics

**Before Fix (Broken)**:

- Video IDs change on every API call
- 100% of video stream requests return 404
- 0% successful video playback

**After Fix (Working)**:

- Video IDs stable across server restarts
- 100% of video stream requests return content
- 100% successful video playback for existing videos

## Time Estimate

**Total Implementation Time**: 15-30 minutes

- Code changes: 5-10 minutes
- Testing: 10-15 minutes
- Validation: 5 minutes

**Confidence Level**: Very High - Single method replacement with well-understood crypto APIs

---

## Anti-Patterns to Avoid

❌ **Overthinking the Hash**: Don't use file content hashing (too slow) or complex algorithms
❌ **Breaking API Contract**: Don't change the ID format structure that frontend expects  
❌ **Ignoring Edge Cases**: Don't assume files are always accessible for stat() calls
❌ **Skipping Tests**: Don't deploy without verifying ID stability across multiple calls
❌ **Cache Invalidation**: Don't add caching complexity when simple stateless hashing works

## Remember

This is a **surgical fix** to the most critical blocker in SOFATHEK. The change is minimal but the impact is enormous - it transforms a completely broken video system into a fully functional one. Every other feature depends on this stability foundation.

**One method, 15 lines of code, complete system functionality restored.**
