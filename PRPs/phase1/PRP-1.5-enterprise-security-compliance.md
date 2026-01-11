---
name: "SOFATHEK Phase 1.5 - Enterprise Security & Compliance Framework"
description: |
  Implement comprehensive security, authentication, authorization, audit logging, and compliance features for SOFATHEK while maintaining the family-friendly, no-complex-auth approach. Focus on data protection, secure defaults, and operational security.

## Purpose

Transform SOFATHEK into an enterprise-grade, security-compliant media center with comprehensive data protection, audit trails, secure defaults, and family-safe content filtering while preserving the simple, authentication-free user experience.

## Core Principles

1. **Security by Design**: Every feature includes security considerations from inception
2. **Zero Trust Architecture**: Validate and sanitize all inputs, assume compromise
3. **Privacy Protection**: Comprehensive data protection with minimal data collection
4. **Family Safety**: Content filtering, parental controls, and safe browsing
5. **Compliance Ready**: GDPR, COPPA, and general privacy regulation compliance

---

## Goal

Create a security-hardened SOFATHEK deployment with enterprise-grade protection, comprehensive audit logging, family-safe content controls, and privacy compliance while maintaining the simple profile-based user experience.

## Why

- **Data Protection**: Family media libraries contain sensitive personal content requiring protection
- **Regulatory Compliance**: GDPR and privacy regulations require proper data handling
- **Family Safety**: Need parental controls and content filtering for family environments
- **Security Threats**: Self-hosted applications are targets for attacks and data breaches
- **Audit Requirements**: Enterprise deployments need comprehensive logging and monitoring
- **Network Security**: Missing protection against common web application vulnerabilities

## What

A comprehensive security and compliance framework layered over the existing SOFATHEK functionality:

### Multi-Layer Security Architecture

```typescript
// Security middleware stack
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"], // For React
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
        mediaSrc: ["'self'", 'blob:'],
        connectSrc: ["'self'", 'ws:', 'wss:'],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false, // Required for video streaming
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  })
);

// Input sanitization and validation
app.use('/api', inputSanitization);
app.use('/api', rateLimitingByEndpoint);
app.use('/api', auditLogging);
```

### Profile-Based Access Control (No Traditional Auth)

```typescript
// Enhanced profile system with permissions and parental controls
interface SecurityProfile {
  id: string;
  name: string;
  type: 'adult' | 'teen' | 'child' | 'admin';
  permissions: {
    canUpload: boolean;
    canDownload: boolean;
    canDelete: boolean;
    canAccessAdmin: boolean;
    allowedCategories: string[];
    contentRating: 'all' | 'teen' | 'mature';
    timeRestrictions?: TimeRestriction[];
  };
  parentalControls: {
    enabled: boolean;
    blockedKeywords: string[];
    allowedSources: string[];
    maxSessionDuration?: number; // minutes
    allowedTimeWindows?: TimeWindow[];
  };
  auditSettings: {
    logViewingHistory: boolean;
    logSearchQueries: boolean;
    logDownloads: boolean;
  };
}

class ProfileSecurityService {
  async validateProfileAccess(profileId: string, action: string, resource?: string): Promise<boolean> {
    const profile = await this.getSecurityProfile(profileId);

    // Check basic permissions
    if (!this.hasPermission(profile, action)) return false;

    // Check content filtering
    if (resource && !this.passesContentFilter(profile, resource)) return false;

    // Check time restrictions
    if (!this.withinAllowedTime(profile)) return false;

    // Log access attempt
    await this.auditService.logAccess(profileId, action, resource, 'allowed');
    return true;
  }

  private passesContentFilter(profile: SecurityProfile, resource: string): boolean {
    // Content rating filter
    const contentRating = this.analyzeContentRating(resource);
    if (!this.isRatingAllowed(profile.permissions.contentRating, contentRating)) {
      return false;
    }

    // Keyword filtering for parental controls
    if (profile.parentalControls.enabled) {
      const hasBlockedKeywords = profile.parentalControls.blockedKeywords.some(keyword =>
        resource.toLowerCase().includes(keyword.toLowerCase())
      );
      if (hasBlockedKeywords) return false;
    }

    return true;
  }
}
```

### Comprehensive Audit Logging

```typescript
// Enterprise-grade audit trail system
export class AuditService {
  private auditLogger: winston.Logger;

  constructor() {
    this.auditLogger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          return JSON.stringify({
            timestamp,
            level,
            event: message,
            ...meta,
            compliance: {
              gdpr: true,
              coppa: true,
              retention: '7_years',
            },
          });
        })
      ),
      transports: [
        new winston.transports.File({
          filename: 'logs/audit.log',
          maxsize: 100 * 1024 * 1024, // 100MB
          maxFiles: 10,
          tailable: true,
        }),
        new winston.transports.File({
          filename: 'logs/security.log',
          level: 'warn', // Security events only
        }),
      ],
    });
  }

  async logVideoAccess(profileId: string, videoId: string, action: 'view' | 'download' | 'stream'): Promise<void> {
    await this.log('VIDEO_ACCESS', {
      profileId: this.hashProfileId(profileId), // Privacy protection
      videoId,
      action,
      timestamp: new Date().toISOString(),
      ipAddress: this.hashIP(this.getCurrentIP()),
      userAgent: this.sanitizeUserAgent(this.getCurrentUserAgent()),
      contentCategory: await this.getVideoCategory(videoId),
      severity: 'info',
    });
  }

  async logSecurityEvent(event: SecurityEvent): Promise<void> {
    await this.log('SECURITY_EVENT', {
      type: event.type,
      severity: event.severity,
      details: event.details,
      sourceIP: this.hashIP(event.sourceIP),
      timestamp: new Date().toISOString(),
      mitigation: event.mitigation,
      riskLevel: this.calculateRiskLevel(event),
    });
  }

  async logDataOperation(operation: DataOperation): Promise<void> {
    await this.log('DATA_OPERATION', {
      type: operation.type, // CREATE, READ, UPDATE, DELETE
      resource: operation.resource,
      profileId: this.hashProfileId(operation.profileId),
      dataSize: operation.dataSize,
      location: operation.location,
      backup: operation.backupCreated,
      retention: operation.retentionPolicy,
      timestamp: new Date().toISOString(),
    });
  }

  private hashProfileId(profileId: string): string {
    // One-way hash for privacy while maintaining audit trail
    return crypto
      .createHash('sha256')
      .update(profileId + process.env.AUDIT_SALT)
      .digest('hex')
      .substring(0, 16);
  }
}
```

### Data Protection & Privacy Controls

```typescript
// GDPR and privacy compliance system
export class PrivacyService {
  async handleDataSubjectRequest(request: DataSubjectRequest): Promise<DataSubjectResponse> {
    const { type, profileId, email } = request;

    switch (type) {
      case 'access':
        return await this.generateDataExport(profileId);

      case 'deletion':
        return await this.deleteAllUserData(profileId);

      case 'portability':
        return await this.exportPortableData(profileId);

      case 'rectification':
        return await this.updateUserData(profileId, request.corrections);
    }
  }

  async generateDataExport(profileId: string): Promise<DataExport> {
    const userData = {
      profile: await this.profileService.getProfile(profileId),
      viewingHistory: await this.getViewingHistory(profileId),
      searchHistory: await this.getSearchHistory(profileId),
      uploadedContent: await this.getUploadedContent(profileId),
      preferences: await this.getUserPreferences(profileId),
      auditLog: await this.getUserAuditLog(profileId),
    };

    // Anonymize sensitive data
    const anonymized = await this.anonymizeExportData(userData);

    return {
      format: 'JSON',
      data: anonymized,
      generatedAt: new Date().toISOString(),
      retention: 'User can delete after download',
      contact: process.env.DATA_CONTROLLER_CONTACT,
    };
  }

  async deleteAllUserData(profileId: string): Promise<DeletionResponse> {
    const deletionLog = [];

    try {
      // Delete profile data
      await this.profileService.deleteProfile(profileId);
      deletionLog.push({ resource: 'profile', status: 'deleted' });

      // Delete viewing history
      await this.historyService.deleteUserHistory(profileId);
      deletionLog.push({ resource: 'viewing_history', status: 'deleted' });

      // Delete uploaded content (with consent confirmation)
      const uploadedVideos = await this.getUploadedVideos(profileId);
      for (const video of uploadedVideos) {
        await this.videoService.deleteVideo(video.id);
        deletionLog.push({ resource: `video_${video.id}`, status: 'deleted' });
      }

      // Anonymize audit logs (retain for legal compliance)
      await this.auditService.anonymizeUserLogs(profileId);
      deletionLog.push({ resource: 'audit_logs', status: 'anonymized' });

      return {
        status: 'completed',
        deletedAt: new Date().toISOString(),
        deletionLog,
        retainedData: ['anonymized_audit_logs'], // Legal requirement
        confirmationId: this.generateConfirmationId(),
      };
    } catch (error) {
      await this.auditService.logDataDeletionFailure(profileId, error);
      throw new Error(`Data deletion failed: ${error.message}`);
    }
  }
}
```

### Content Security & Family Safety

```typescript
// Content filtering and family safety system
export class ContentSecurityService {
  private contentAnalyzer: ContentAnalyzer;
  private safeSearchProvider: SafeSearchProvider;

  async analyzeVideoSafety(videoPath: string): Promise<ContentSafetyReport> {
    const report: ContentSafetyReport = {
      videoId: path.basename(videoPath),
      scannedAt: new Date().toISOString(),
      safetyLevel: 'unknown',
      contentRating: 'unrated',
      warnings: [],
      parentalAdvisory: false,
    };

    // Filename analysis for obvious inappropriate content
    const filename = path.basename(videoPath).toLowerCase();
    const inappropriateKeywords = await this.getInappropriateKeywords();

    for (const keyword of inappropriateKeywords) {
      if (filename.includes(keyword)) {
        report.warnings.push({
          type: 'filename_inappropriate',
          keyword: keyword,
          severity: 'high',
        });
        report.parentalAdvisory = true;
      }
    }

    // Metadata analysis
    const metadata = await this.ffmpegService.extractMetadata(videoPath);
    if (metadata.title || metadata.description) {
      const textAnalysis = await this.analyzeText(metadata.title + ' ' + metadata.description);
      report.contentRating = textAnalysis.suggestedRating;
      report.warnings.push(...textAnalysis.warnings);
    }

    // Set overall safety level
    report.safetyLevel = this.calculateSafetyLevel(report.warnings);

    // Store safety report
    await this.storeSafetyReport(report);

    return report;
  }

  async filterYouTubeURL(url: string, profileType: string): Promise<URLFilterResult> {
    // Validate YouTube URL safety
    const videoId = this.extractYouTubeVideoId(url);

    // Check against safe search database
    const safeSearchResult = await this.safeSearchProvider.checkVideo(videoId);

    // Apply profile-specific filtering
    const profileRestrictions = await this.getProfileRestrictions(profileType);

    const result: URLFilterResult = {
      originalUrl: url,
      videoId,
      allowed: true,
      reason: null,
      safeSearchResult,
      profileRestrictions,
    };

    // Block if unsafe content detected
    if (safeSearchResult.rating === 'restricted' && profileType !== 'adult') {
      result.allowed = false;
      result.reason = 'Content not suitable for profile type';
    }

    // Block if profile restrictions apply
    if (profileRestrictions.blockedChannels.includes(safeSearchResult.channelId)) {
      result.allowed = false;
      result.reason = 'Channel blocked by parental controls';
    }

    return result;
  }

  private async getInappropriateKeywords(): Promise<string[]> {
    // Load from secure configuration, regularly updated
    return [
      // Adult content indicators
      'adult',
      'explicit',
      'mature',
      'nsfw',
      // Violence indicators
      'violent',
      'gore',
      'brutal',
      'extreme',
      // Other inappropriate content
      'drug',
      'alcohol',
      'smoking',
      'gambling',
      // This would be a comprehensive, regularly updated list
    ];
  }
}
```

### Success Criteria

- [ ] **Security Headers**: All security headers properly configured (A+ rating on securityheaders.com)
- [ ] **Input Validation**: 100% of user inputs validated and sanitized
- [ ] **Audit Logging**: Comprehensive logging of all user actions and system events
- [ ] **Content Filtering**: Automated inappropriate content detection and blocking
- [ ] **Privacy Compliance**: Full GDPR data subject request handling capability
- [ ] **Family Safety**: Parental controls and age-appropriate content filtering
- [ ] **Vulnerability Scanning**: Zero high/critical security vulnerabilities
- [ ] **Data Encryption**: All sensitive data encrypted at rest and in transit

## All Needed Context

### Security Threat Model

```yaml
# Threats to mitigate
threats:
  web_application:
    - XSS (Cross-Site Scripting)
    - CSRF (Cross-Site Request Forgery)
    - SQL Injection (even though we use JSON files)
    - File upload vulnerabilities
    - Path traversal attacks

  data_privacy:
    - Unauthorized access to family videos
    - Data leakage through logs
    - Lack of user data control
    - Inadequate data retention policies

  family_safety:
    - Inappropriate content exposure
    - Unrestricted YouTube downloads
    - Lack of parental controls
    - No time-based access restrictions

  infrastructure:
    - Container escape attacks
    - Network-based attacks
    - DoS/DDoS attacks
    - Malicious file uploads
```

### Compliance Requirements

```yaml
# Regulatory compliance needs
gdpr:
  data_subject_rights: [access, rectification, erasure, portability, restriction]
  lawful_basis: 'Legitimate interest for family media management'
  data_protection_officer: 'Optional for family use, required for enterprise'
  privacy_by_design: 'Minimal data collection, strong defaults'

coppa: # If children under 13 use the system
  parental_consent: 'Profile-based controls instead of traditional consent'
  data_minimization: 'No personal data collection beyond usage patterns'
  safe_harbor: 'Family use exception, no data sharing'

iso27001: # For enterprise deployments
  access_control: 'Profile-based permissions system'
  audit_logging: 'Comprehensive event logging'
  incident_response: 'Security event detection and response'
  risk_management: 'Regular security assessments'
```

### New Dependencies

```yaml
security_libraries:
  - helmet: '^7.1.0' # Security headers middleware
  - express-rate-limit: '^7.1.5' # Rate limiting protection
  - express-validator: '^7.0.1' # Input validation and sanitization
  - bcrypt: '^5.1.1' # Password hashing (for admin features)
  - jsonwebtoken: '^9.0.2' # JWT tokens (for secure sessions)
  - node-forge: '^1.3.1' # Cryptographic operations
  - multer-virus-scanner: '^1.0.0' # File upload virus scanning

privacy_compliance:
  - gdpr-cookie-consent: '^1.0.4' # Cookie consent management
  - data-anonymizer: '^2.1.0' # Data anonymization utilities

content_filtering:
  - content-filter: '^1.4.0' # Text content filtering
  - safe-search-api: '^2.0.1' # External safe search validation
```

## Implementation Blueprint

### Task List

```yaml
Phase 1.5.1: Security Headers & Input Validation
FILES:
  - backend/src/middleware/security.ts (NEW)
  - backend/src/middleware/inputValidation.ts (NEW)
ACTION: Implement comprehensive security middleware stack
PATTERN: |
  // Security headers configuration
  export const securityMiddleware = [
    helmet({
      contentSecurityPolicy: cspConfig,
      hsts: { maxAge: 31536000, includeSubDomains: true },
      noSniff: true,
      frameguard: { action: 'deny' },
      xssFilter: true
    }),
    cors({
      origin: process.env.FRONTEND_URL,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Profile-ID']
    }),
    rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // requests per window
      message: 'Too many requests from this IP',
      standardHeaders: true
    })
  ];

Phase 1.5.2: Profile-Based Security System
FILES:
  - backend/src/services/profileSecurity.ts (NEW)
  - backend/src/middleware/profileAuth.ts (NEW)
  - backend/src/types/security.ts (NEW)
ACTION: Implement profile-based access control and parental controls
ENHANCEMENT: Add security layer without traditional authentication
PATTERN: |
  export class ProfileSecurityService {
    async validateAccess(profileId: string, resource: string, action: string): Promise<SecurityValidation> {
      const profile = await this.getSecurityProfile(profileId);

      const validation: SecurityValidation = {
        allowed: false,
        reason: null,
        restrictions: [],
        auditLog: true
      };

      // Check basic permissions
      if (!profile.permissions[action]) {
        validation.reason = 'Insufficient permissions';
        return validation;
      }

      // Apply content filtering
      const contentCheck = await this.contentSecurityService.validateContent(resource, profile);
      if (!contentCheck.passed) {
        validation.reason = contentCheck.reason;
        validation.restrictions = contentCheck.appliedFilters;
        return validation;
      }

      validation.allowed = true;
      return validation;
    }
  }

Phase 1.5.3: Comprehensive Audit System
FILES:
  - backend/src/services/audit.ts (NEW)
  - backend/src/middleware/auditLogging.ts (NEW)
ACTION: Implement enterprise-grade audit logging
ENHANCEMENT: Full compliance with audit requirements
PATTERN: |
  export class AuditService {
    async logEvent(event: AuditEvent): Promise<void> {
      const auditRecord = {
        id: this.generateEventId(),
        timestamp: new Date().toISOString(),
        type: event.type,
        actor: this.anonymizeActor(event.profileId),
        resource: event.resource,
        action: event.action,
        outcome: event.outcome,
        ipAddress: this.hashIP(event.ipAddress),
        userAgent: this.sanitizeUserAgent(event.userAgent),
        metadata: this.sanitizeMetadata(event.metadata),
        compliance: {
          gdprApplicable: true,
          retentionPeriod: '7_years',
          anonymizationScheduled: this.calculateAnonymizationDate()
        }
      };

      await this.storeAuditRecord(auditRecord);
      await this.checkComplianceRequirements(auditRecord);
    }
  }

Phase 1.5.4: Content Security & Family Safety
FILES:
  - backend/src/services/contentSecurity.ts (NEW)
  - backend/src/services/familySafety.ts (NEW)
ACTION: Implement content filtering and parental controls
ENHANCEMENT: Family-safe content management
PATTERN: |
  export class FamilySafetyService {
    async validateVideoUpload(file: UploadedFile, profileId: string): Promise<UploadValidation> {
      const profile = await this.profileSecurityService.getProfile(profileId);

      // File safety checks
      const virusScanResult = await this.virusScanner.scanFile(file.path);
      if (!virusScanResult.clean) {
        return { allowed: false, reason: 'File failed security scan' };
      }

      // Filename content filtering
      const filenameCheck = await this.contentFilter.checkFilename(file.originalname);
      if (!filenameCheck.appropriate) {
        return { allowed: false, reason: 'Inappropriate filename detected' };
      }

      // Profile-specific restrictions
      if (!profile.permissions.canUpload) {
        return { allowed: false, reason: 'Upload not permitted for this profile' };
      }

      return { allowed: true, safetyChecks: [virusScanResult, filenameCheck] };
    }
  }

Phase 1.5.5: Privacy & GDPR Compliance
FILES:
  - backend/src/services/privacy.ts (NEW)
  - backend/src/routes/privacy.ts (NEW)
ACTION: Implement data subject rights and privacy controls
ENHANCEMENT: Full regulatory compliance capability
PATTERN: |
  export class PrivacyService {
    async handleSubjectAccessRequest(profileId: string): Promise<DataExport> {
      // Collect all user data
      const userData = await this.aggregateUserData(profileId);

      // Apply data minimization
      const minimizedData = await this.minimizeExportData(userData);

      // Anonymize where required
      const anonymizedData = await this.anonymizeExportData(minimizedData);

      return {
        exportId: this.generateExportId(),
        generatedAt: new Date().toISOString(),
        format: 'JSON',
        data: anonymizedData,
        retention: '30_days',
        downloadInstructions: 'Available for download for 30 days',
        contact: process.env.DATA_CONTROLLER_EMAIL
      };
    }
  }
```

## Validation Loop

### Level 1: Security Headers Validation

```bash
# Test security headers
curl -I http://localhost:3001/api/health

# Expected headers:
# Strict-Transport-Security: max-age=31536000; includeSubDomains
# X-Content-Type-Options: nosniff
# X-Frame-Options: DENY
# X-XSS-Protection: 1; mode=block
# Content-Security-Policy: default-src 'self'...

# Test with online tools
# https://securityheaders.com/ - Should achieve A+ rating
```

### Level 2: Input Validation & XSS Protection

```bash
# Test XSS prevention
curl -X POST localhost:3001/api/videos \
  -H "Content-Type: application/json" \
  -d '{"search": "<script>alert(\"xss\")</script>"}'

# Expected: Input sanitized, no script execution

# Test SQL injection (even though we use JSON)
curl localhost:3001/api/videos?category="'; DROP TABLE videos; --"
# Expected: Input validated and sanitized

# Test path traversal
curl localhost:3001/api/videos/../../../etc/passwd
# Expected: 404 or proper error, no file access
```

### Level 3: Profile Security & Access Control

```bash
# Test profile permissions
curl -X POST localhost:3001/api/videos/upload \
  -H "X-Profile-ID: child_profile_123" \
  -F "video=@test.mp4"

# Expected: Upload blocked if child profile doesn't have upload permission

# Test content filtering
curl -X POST localhost:3001/api/downloads \
  -H "X-Profile-ID: child_profile_123" \
  -d '{"url": "https://youtube.com/watch?v=inappropriate_content"}'

# Expected: Download blocked by content filter
```

### Level 4: Audit Logging Verification

```bash
# Generate some activity
curl localhost:3001/api/videos
curl -X POST localhost:3001/api/videos/upload -F "video=@test.mp4"

# Check audit logs
tail -f logs/audit.log | jq

# Expected: Structured JSON logs with:
# - Hashed profile IDs (privacy protection)
# - Detailed action information
# - Compliance metadata
# - No sensitive data exposure
```

### Level 5: Privacy Compliance Testing

```bash
# Test data subject access request
curl -X POST localhost:3001/api/privacy/access \
  -H "Content-Type: application/json" \
  -d '{"profileId": "test_profile", "email": "user@example.com"}'

# Expected: Data export generated with anonymized information

# Test data deletion request
curl -X POST localhost:3001/api/privacy/delete \
  -H "Content-Type: application/json" \
  -d '{"profileId": "test_profile", "confirmationCode": "DELETE_ALL_DATA"}'

# Expected: All user data deleted, confirmation provided
```

## Known Gotchas & Security Best Practices

### Content Security Policy (CSP) Configuration

```typescript
// ✅ GOOD: Balanced CSP for video streaming application
const cspConfig = {
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'"], // React requires inline scripts
    styleSrc: ["'self'", "'unsafe-inline'"], // CSS-in-JS requires inline styles
    mediaSrc: ["'self'", 'blob:'], // Video streaming requires blob URLs
    connectSrc: ["'self'", 'ws:', 'wss:'], // WebSocket connections
    imgSrc: ["'self'", 'data:', 'blob:'], // Thumbnails and images
  },
};

// ❌ BAD: Overly restrictive CSP that breaks video functionality
const badCSP = {
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"], // Breaks React
    mediaSrc: ["'self'"], // Breaks blob video streaming
  },
};
```

### Profile ID Hashing for Privacy

```typescript
// ✅ GOOD: Consistent hashing with salt for audit logs
private hashProfileId(profileId: string): string {
  const salt = process.env.AUDIT_SALT || 'default-salt-change-in-production';
  return crypto.createHash('sha256')
    .update(profileId + salt)
    .digest('hex')
    .substring(0, 16); // Consistent length
}

// ❌ BAD: No hashing or inconsistent hashing
private logProfileId(profileId: string): string {
  return profileId; // Privacy violation - stores identifiable data
}
```

### Input Validation Patterns

```typescript
// ✅ GOOD: Comprehensive validation and sanitization
const validateVideoSearch = [
  body('search')
    .trim()
    .escape() // HTML entity encoding
    .isLength({ max: 255 })
    .blacklist('<>"\'/\\') // Additional character filtering
    .withMessage('Invalid search query'),

  body('category').isIn(['movies', 'tv-shows', 'documentaries', 'family', 'youtube']).withMessage('Invalid category'),

  handleValidationErrors,
];

// ❌ BAD: No validation or sanitization
app.post('/api/search', (req, res) => {
  const query = req.body.search; // Direct use of user input - dangerous
  // ... use query directly in file operations
});
```

### File Upload Security

```typescript
// ✅ GOOD: Comprehensive file upload security
const secureUpload = multer({
  dest: 'temp/',
  limits: { fileSize: 5 * 1024 * 1024 * 1024 }, // 5GB
  fileFilter: (req, file, cb) => {
    // MIME type validation
    const allowedMimes = ['video/mp4', 'video/webm', 'video/mkv'];
    if (!allowedMimes.includes(file.mimetype)) {
      return cb(new Error('Invalid file type'));
    }

    // Filename sanitization
    file.originalname = sanitizeFilename(file.originalname);

    cb(null, true);
  },
});

// ❌ BAD: No file type or size validation
const insecureUpload = multer({ dest: 'uploads/' }); // Accepts any file type/size
```

## Success Metrics

**Security Posture**:

- Security headers scan: A+ rating
- Vulnerability scan: 0 high/critical issues
- Input validation: 100% of endpoints protected
- File upload security: 100% malicious file detection

**Privacy Compliance**:

- Data subject requests: < 30 day response time
- Audit log completeness: 100% of user actions logged
- Data anonymization: 100% of export data anonymized
- Retention policy: Automated data purging after 7 years

**Family Safety**:

- Content filtering accuracy: 95%+ inappropriate content blocked
- Parental control effectiveness: 100% restricted profile compliance
- Safe search integration: 99%+ uptime for content validation

**Operational Security**:

- Failed authentication attempts: < 0.1% false positives
- Security incident detection: < 5 minute response time
- Audit log integrity: 100% tamper detection capability

## Time Estimate

**Total Implementation Time**: 12-16 hours

- Security headers and middleware: 2-3 hours
- Profile-based access control: 3-4 hours
- Audit logging system: 3-4 hours
- Content security and family safety: 3-4 hours
- Privacy compliance features: 2-3 hours
- Testing and validation: 2-3 hours

**Confidence Level**: Medium - Complex security requirements with compliance needs

---

## Anti-Patterns to Avoid

❌ **Security Theater**: Don't implement security measures that look good but provide no real protection
❌ **Over-Authentication**: Don't add complex authentication when profile-based access control suffices
❌ **Log Everything**: Don't log sensitive data or create excessive audit trails that become privacy violations
❌ **Content Filtering Overreach**: Don't block legitimate content due to overly aggressive filtering
❌ **Compliance Gold-Plating**: Don't implement more privacy controls than legally required for family use

## Remember

This security framework transforms SOFATHEK into an enterprise-ready, privacy-compliant media center while preserving the family-friendly simplicity. Every security measure is balanced against usability, ensuring protection without complexity.

**Family-friendly simplicity with enterprise-grade security.**
