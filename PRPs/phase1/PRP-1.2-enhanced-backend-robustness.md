---
name: "SOFATHEK Phase 1.2 - Enhanced Backend API Robustness & Performance"
description: |
  Strengthen the existing Express 5.x backend with enhanced error handling, request validation, rate limiting, and API documentation. Build upon the solid foundation while addressing production readiness gaps.

## Purpose

Transform the functional but basic backend API into a production-grade service with comprehensive error handling, validation, security, and observability. Preserve all existing functionality while enhancing robustness and developer experience.

## Core Principles

1. **Non-Breaking Enhancement**: Preserve all existing API contracts while adding robustness
2. **Defense in Depth**: Multiple layers of validation, sanitization, and error handling
3. **Observable Systems**: Comprehensive logging, metrics, and debugging capabilities
4. **Developer Experience**: Clear error messages, API documentation, and debugging tools
5. **Production Ready**: Rate limiting, security headers, and operational monitoring

---

## Goal

Enhance the existing SOFATHEK backend API with production-grade features including request validation, comprehensive error handling, rate limiting, API documentation, and operational monitoring while maintaining 100% backwards compatibility.

## Why

- **Production Readiness**: Current API lacks enterprise-grade error handling and security
- **Developer Experience**: Missing API documentation and unclear error messages
- **Operational Safety**: No rate limiting or request validation for malicious inputs
- **Debugging Capability**: Limited observability for troubleshooting issues
- **Security Hardening**: Missing security headers and input sanitization
- **Performance Monitoring**: No metrics or performance tracking capabilities

## What

A comprehensive enhancement layer over the existing backend infrastructure:

### Enhanced Error Handling System

```typescript
// Current: Basic error responses
res.status(500).json({ error: 'Failed to fetch videos' });

// Enhanced: Structured error responses with tracking
import { APIError, handleAPIError } from '../middleware/errorHandler';

try {
  // ... business logic
} catch (error) {
  throw new APIError('VIDEO_FETCH_FAILED', {
    message: 'Unable to retrieve video library',
    details: { category, page, limit },
    originalError: error,
    userMessage: 'There was a problem loading your videos. Please try again.',
  });
}
```

### Request Validation & Sanitization

```typescript
// Enhanced: Comprehensive input validation
import { validateRequest, sanitizeInput } from '../middleware/validation';

router.get(
  '/',
  validateRequest({
    query: {
      category: { type: 'string', pattern: /^[a-zA-Z0-9-_]+$/, optional: true },
      page: { type: 'number', min: 1, max: 1000, default: 1 },
      limit: { type: 'number', min: 1, max: 100, default: 20 },
      search: { type: 'string', maxLength: 255, sanitize: true, optional: true },
    },
  }),
  async (req, res) => {
    /* ... */
  }
);
```

### API Documentation & OpenAPI Spec

```typescript
/**
 * @openapi
 * /api/videos:
 *   get:
 *     summary: Get paginated video library
 *     description: Retrieves videos from the media library with optional filtering and pagination
 *     parameters:
 *       - name: category
 *         in: query
 *         schema:
 *           type: string
 *           enum: [movies, tv-shows, documentaries, family, youtube]
 *     responses:
 *       200:
 *         description: Video library response with pagination
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/VideoLibraryResponse'
 */
```

### Success Criteria

- [ ] **Error Handling**: All API endpoints return structured, trackable errors
- [ ] **Input Validation**: 100% of user inputs validated and sanitized
- [ ] **Rate Limiting**: Protection against API abuse and DoS
- [ ] **API Docs**: Complete OpenAPI 3.0 specification with interactive UI
- [ ] **Security Headers**: CORS, helmet, and security middleware configured
- [ ] **Logging**: Structured JSON logging with correlation IDs
- [ ] **Metrics**: Basic performance and usage metrics collection
- [ ] **Health Checks**: Comprehensive system health monitoring
- [ ] **Backwards Compatibility**: Zero breaking changes to existing API

## All Needed Context

### Current System Analysis

```yaml
# Existing API Structure (to preserve)
routes:
  - GET /api/videos (functional, needs enhancement)
  - GET /api/videos/:id (functional, needs validation)
  - GET /api/videos/:id/stream (functional, needs security)
  - POST /api/videos/upload (functional, needs validation)
  - GET /api/downloads (functional, needs documentation)
  - POST /api/downloads (functional, needs validation)

# Enhancement Opportunities
gaps:
  - No input validation or sanitization
  - Basic error responses without structure
  - No API documentation
  - Missing security headers
  - No rate limiting protection
  - Limited logging and observability
  - No request/response validation
```

### Dependencies & Libraries

```yaml
new_dependencies:
  - express-validator: '^7.0.1' # Input validation and sanitization
  - helmet: '^7.1.0' # Security headers middleware
  - express-rate-limit: '^7.1.5' # Rate limiting protection
  - swagger-jsdoc: '^6.2.8' # OpenAPI documentation generation
  - swagger-ui-express: '^5.0.0' # API documentation UI
  - winston: '^3.11.0' # Structured logging
  - correlator: '^2.1.0' # Request correlation IDs
  - express-slow-down: '^2.0.1' # Progressive delay for abuse

existing_dependencies: # Keep all current
  - express: '^5.0.0'
  - multer: '^1.4.5'
  - fs-extra: '^11.2.0'
  - glob: '^10.3.10'
```

### File Structure Enhancement

```yaml
# New files to create
backend/src/
├── middleware/
│   ├── errorHandler.ts          # Structured error handling
│   ├── validation.ts            # Input validation & sanitization
│   ├── rateLimiting.ts          # Rate limiting configuration
│   ├── security.ts              # Security headers & CORS
│   ├── logging.ts               # Request/response logging
│   └── apiDocumentation.ts      # OpenAPI spec generation
├── types/
│   ├── api.ts                   # API request/response types
│   └── errors.ts                # Error type definitions
├── utils/
│   ├── logger.ts                # Winston logger configuration
│   └── metrics.ts               # Basic metrics collection
└── docs/
    └── openapi.yaml            # OpenAPI 3.0 specification

# Files to enhance (not replace)
backend/src/routes/
├── videos.ts                   # Add validation & error handling
├── downloads.ts                # Add validation & error handling
├── admin.ts                    # Add validation & error handling
└── usage.ts                    # Add validation & error handling
```

## Implementation Blueprint

### Task List

```yaml
Phase 1.2.1: Enhanced Error Handling System
FILES:
  - backend/src/middleware/errorHandler.ts (NEW)
  - backend/src/types/errors.ts (NEW)
ACTION: Create structured error handling with user-friendly messages
PATTERN: |
  export class APIError extends Error {
    constructor(
      public code: string,
      public details: {
        message: string;
        userMessage: string;
        statusCode?: number;
        originalError?: Error;
        metadata?: any;
      }
    ) {
      super(details.message);
      this.name = 'APIError';
    }
  }

Phase 1.2.2: Input Validation Middleware
FILES:
  - backend/src/middleware/validation.ts (NEW)
ACTION: Create comprehensive request validation and sanitization
ENHANCEMENT: Protect against injection, validate all parameters
PATTERN: |
  export const validateVideoQuery = [
    query('category')
      .optional()
      .isIn(['movies', 'tv-shows', 'documentaries', 'family', 'youtube'])
      .withMessage('Invalid category'),
    query('page')
      .optional()
      .isInt({ min: 1, max: 1000 })
      .toInt()
      .withMessage('Page must be between 1 and 1000'),
    query('search')
      .optional()
      .isLength({ max: 255 })
      .trim()
      .escape()
      .withMessage('Search term too long'),
    handleValidationErrors
  ];

Phase 1.2.3: Security & Rate Limiting
FILES:
  - backend/src/middleware/security.ts (NEW)
  - backend/src/middleware/rateLimiting.ts (NEW)
ACTION: Add production security layers
ENHANCEMENT: Protect against abuse and security threats
PATTERN: |
  // Rate limiting by endpoint and user
  export const videoApiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP',
    standardHeaders: true,
    legacyHeaders: false,
  });

  export const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // limit uploads to 5 per hour per IP
    message: 'Upload limit exceeded. Try again later.',
  });

Phase 1.2.4: API Documentation System
FILES:
  - backend/src/docs/openapi.yaml (NEW)
  - backend/src/middleware/apiDocumentation.ts (NEW)
ACTION: Create comprehensive API documentation
ENHANCEMENT: Developer experience and integration support
PATTERN: |
  components:
    schemas:
      VideoLibraryResponse:
        type: object
        properties:
          videos:
            type: array
            items:
              $ref: '#/components/schemas/Video'
          pagination:
            $ref: '#/components/schemas/Pagination'
          categories:
            type: array
            items:
              type: string
      Error:
        type: object
        properties:
          error:
            type: string
          message:
            type: string
          userMessage:
            type: string
          correlationId:
            type: string

Phase 1.2.5: Enhanced Logging & Observability
FILES:
  - backend/src/utils/logger.ts (NEW)
  - backend/src/middleware/logging.ts (NEW)
ACTION: Add structured logging and request tracing
ENHANCEMENT: Operational visibility and debugging capability
PATTERN: |
  export const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
    defaultMeta: { service: 'sofathek-api' },
    transports: [
      new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
      new winston.transports.File({ filename: 'logs/combined.log' }),
      new winston.transports.Console({
        format: winston.format.simple()
      })
    ]
  });
```

### Integration Points with Existing Code

```typescript
// PRESERVE: All existing route handlers
// ENHANCE: Wrap with new middleware

// Before (current working code)
router.get('/', async (req, res) => {
  try {
    const category = req.query.category as string;
    // ... existing logic
    res.json({ videos: videoResponse, pagination, categories });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch videos' });
  }
});

// After (enhanced with middleware)
router.get(
  '/',
  videoApiLimiter, // NEW: Rate limiting
  validateVideoQuery, // NEW: Input validation
  async (req, res, next) => {
    try {
      const category = req.query.category as string; // Already validated
      // ... existing logic (UNCHANGED)

      logger.info('Video library fetched', {
        category,
        count: videoResponse.length,
        correlationId: req.correlationId,
      });

      res.json({ videos: videoResponse, pagination, categories });
    } catch (error) {
      next(
        new APIError('VIDEO_FETCH_FAILED', {
          message: 'Failed to retrieve video library',
          userMessage: 'Unable to load videos. Please try again.',
          originalError: error,
          metadata: { category, page: req.query.page },
        })
      );
    }
  }
);
```

## Validation Loop

### Level 1: API Documentation Verification

```bash
# Start enhanced server
npm run dev

# Verify API docs are accessible
curl -s http://localhost:3001/api-docs
# Should return Swagger UI HTML

# Test OpenAPI spec endpoint
curl -s http://localhost:3001/api-docs/swagger.json
# Should return valid OpenAPI 3.0 JSON
```

### Level 2: Input Validation Testing

```bash
# Test valid requests (should work)
curl -s "http://localhost:3001/api/videos?category=movies&page=1&limit=20"
# Expected: 200 OK with video data

# Test invalid inputs (should reject)
curl -s "http://localhost:3001/api/videos?page=0"
# Expected: 400 Bad Request with validation error

curl -s "http://localhost:3001/api/videos?category=invalid"
# Expected: 400 Bad Request with category error

# Test XSS attempt (should sanitize)
curl -s "http://localhost:3001/api/videos?search=<script>alert('xss')</script>"
# Expected: 200 OK with sanitized search term
```

### Level 3: Rate Limiting Verification

```bash
# Test normal usage (should work)
for i in {1..10}; do
  curl -s http://localhost:3001/api/videos > /dev/null
  echo "Request $i completed"
done

# Test rate limiting (should block after limit)
for i in {1..110}; do
  curl -s http://localhost:3001/api/videos 2>/dev/null || echo "Blocked at request $i"
done
# Expected: Requests blocked around 100
```

### Level 4: Error Handling & Logging

```bash
# Trigger an error condition
curl -s http://localhost:3001/api/videos/invalid_id
# Should return structured error with correlationId

# Check logs were created
ls -la logs/
# Should see error.log and combined.log files

# Verify structured logging
tail logs/combined.log | jq .
# Should show JSON structured log entries
```

## Known Gotchas & Best Practices

### Backwards Compatibility Preservation

```typescript
// ✅ GOOD: Preserve existing response format
res.json({
  videos: videoResponse, // KEEP: Existing structure
  pagination, // KEEP: Existing structure
  categories, // KEEP: Existing structure
  // NEW: Additional metadata (optional)
  _metadata: {
    correlationId: req.correlationId,
    responseTime: Date.now() - req.startTime,
  },
});

// ❌ BAD: Breaking response format
res.json({
  data: { videos: videoResponse }, // BREAKS: Frontend expects videos directly
  meta: { pagination }, // BREAKS: Frontend expects pagination directly
});
```

### Rate Limiting Configuration

```typescript
// ✅ GOOD: Different limits per endpoint type
const readLimiter = rateLimit({ max: 100 }); // Higher for reads
const writeLimiter = rateLimit({ max: 5 }); // Lower for uploads
const streamLimiter = rateLimit({ max: 50 }); // Medium for streaming

// ❌ BAD: Same limit for all operations
const globalLimiter = rateLimit({ max: 10 }); // Too restrictive for normal use
```

### Error Message Security

```typescript
// ✅ GOOD: User-safe error messages
throw new APIError('VIDEO_NOT_FOUND', {
  message: 'Video file missing at /path/to/video.mp4', // Internal logging
  userMessage: 'This video is no longer available', // User-facing
  statusCode: 404,
});

// ❌ BAD: Exposing internal details to users
res.status(500).json({
  error: "ENOENT: no such file or directory, open '/secret/path/video.mp4'",
});
```

## Success Metrics

**API Robustness**:

- 100% of endpoints have input validation
- 0 unhandled exceptions reaching users
- All errors include correlation IDs for tracking

**Security Enhancement**:

- Rate limiting blocks > 95% of abuse attempts
- All user inputs sanitized against XSS/injection
- Security headers present on all responses

**Developer Experience**:

- Complete OpenAPI documentation available
- Interactive API explorer functional
- Clear, actionable error messages

**Operational Visibility**:

- Structured JSON logs for all requests
- Performance metrics for all endpoints
- Health check endpoints for monitoring

## Time Estimate

**Total Implementation Time**: 4-6 hours

- Error handling system: 1-2 hours
- Input validation: 1-2 hours
- Security & rate limiting: 1 hour
- API documentation: 1-2 hours
- Testing & validation: 1 hour

**Confidence Level**: High - Building on existing working foundation

---

## Anti-Patterns to Avoid

❌ **Over-Engineering**: Don't add complex authentication when simple rate limiting suffices
❌ **Breaking Changes**: Don't modify existing response formats that frontend depends on
❌ **Validation Overkill**: Don't validate internal service calls, only user inputs
❌ **Logging Overload**: Don't log sensitive data or create excessive log volume
❌ **Documentation Debt**: Don't skip OpenAPI annotations for new endpoints

## Remember

This enhancement transforms the functional SOFATHEK backend into a production-ready API service. Every change preserves existing functionality while adding the robustness, security, and observability needed for real-world deployment.

**Foundation preserved, production readiness achieved.**
