# Investigation: CRITICAL: Insufficient testing coverage for broader URL validation security

**Issue**: #190 (https://github.com/tbrandenburg/sofathek/issues/190)
**Type**: BUG (Security)
**Investigated**: 2026-03-23T15:30:00Z

### Assessment

| Metric     | Value                         | Reasoning                                                                                              |
| ---------- | ----------------------------- | ------------------------------------------------------------------------------------------------------ |
| Severity   | HIGH                          | SSRF vulnerability allows attackers to access internal services; shell injection gaps exist despite mitigation by youtube-dl-exec |
| Complexity | MEDIUM                        | Requires changes to validator, tests, and security functions across 3 files with integration dependencies |
| Confidence | HIGH                          | Root cause clearly identified through code analysis; all evidence chain confirmed with actual code snippets |

---

## Problem Statement

PR #185 intentionally changed backend URL validation from YouTube-only patterns to accepting any HTTP/HTTPS URL. However, the implementation lacks critical security validations: no SSRF protection (internal IP/domain filtering), incomplete shell metacharacter detection (URL encoding bypass), and the `YOUTUBE_URL_PATTERNS` constant is defined but never enforced in the backend.

---

## Analysis

### Root Cause / Change Rationale

PR #185 was an intentional design decision to broaden URL support beyond YouTube. The backend validator was rewritten to accept any valid HTTP/HTTPS URL instead of using the `YOUTUBE_URL_PATTERNS` regex patterns. However, this created security gaps:

1. **SSRF Vulnerability**: No filtering for internal/private IP addresses or hostnames
2. **Incomplete Shell Protection**: URL-encoded metacharacters bypass basic detection
3. **Unused Patterns**: The existing `YOUTUBE_URL_PATTERNS` are frontend-only; backend ignores them

### Evidence Chain

**ISSUE: Backend accepts ANY HTTP/HTTPS URL**
↓ BECAUSE: Validator only checks URL format and basic shell metacharacters
↓ BECAUSE: `YOUTUBE_URL_PATTERNS` defined in `backend/src/types/youtube.ts:116-121` but **never used** in validator
↓ ROOT CAUSE: `youTubeUrlValidator.ts:30-41` accepts any HTTP/HTTPS URL without domain/IP restrictions

**ISSUE: No SSRF protection**
↓ BECAUSE: Validator doesn't check hostname against private IP ranges or blocklist
Evidence: `youTubeUrlValidator.ts:36-39` only checks if hostname exists, not if it's safe

**ISSUE: Incomplete shell metacharacter detection**
↓ BECAUSE: Regex only checks unencoded characters
Evidence: `backend/src/types/youtube.ts:111` - `/[;&|`$(){}[\]<>]/` misses URL-encoded variants

### Affected Files

| File            | Lines | Action | Description                                       |
| --------------- | ----- | ------ | ------------------------------------------------- |
| `backend/src/types/youtube.ts` | 111-125 | UPDATE | Add SSRF protection, enhance shell metachar detection |
| `backend/src/services/youTubeUrlValidator.ts` | 1-50 | UPDATE | Add hostname/IP validation against private networks |
| `backend/src/__tests__/unit/services/youTubeUrlValidator.test.ts` | 1-53 | UPDATE | Add SSRF, URL-encoded injection, private IP tests |

### Integration Points

- `backend/src/services/youTubeDownloadService.ts:44` - Calls `urlValidator.validate(request.url)`
- `backend/src/services/youTubeMetadataExtractor.ts:16` - Passes URL to `youtubedl.exec(url, {...})`
- `backend/src/services/youTubeFileDownloader.ts:27` - Passes URL to `youtubedl.exec(url, {...})`
- `frontend/src/services/youtube.ts:79` - Frontend validates with `YOUTUBE_URL_PATTERNS` (still YouTube-only)

### Git History

- **Introduced**: `749f227` - `feat: allow non-YouTube links in video download flow (#185)` - 2026-03-23
- **Last modified**: `749f227` - Same commit (validator created in this PR)
- **Implication**: Intentional feature change with security gaps introduced

---

## Implementation Plan

### Step 1: Add SSRF Protection Function

**File**: `backend/src/types/youtube.ts`
**Lines**: 111-125
**Action**: UPDATE

**Current code:**

```typescript
// Line 111
const SHELL_METACHARACTERS = /[;&|`$(){}[\]<>]/;

// Lines 123-125
export const containsShellMetacharacters = (url: string): boolean => {
  return SHELL_METACHARACTERS.test(url);
};
```

**Required change:**

```typescript
const SHELL_METACHARACTERS = /[;&|`$(){}[\]<>\\]/;

const PRIVATE_IP_PATTERNS = [
  /^127\./,                          // Loopback
  /^10\./,                           // Class A private
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,  // Class B private
  /^192\.168\./,                      // Class C private
  /^169\.254\./,                      // Link-local
  /^0\./,                            // Current network
  /^224\./,                          // Multicast
  /^240\./,                          // Reserved
  /^localhost$/i,                    // localhost hostname
  /^.*\.local$/i,                   // .local domains
] as const;

const BLOCKED_HOSTNAMES = [
  'localhost',
  'localhost.localdomain',
  'ip6-localhost',
  'ip6-loopback',
] as const;

export const containsShellMetacharacters = (url: string): boolean => {
  const decodedUrl = decodeURIComponent(url);
  return SHELL_METACHARACTERS.test(decodedUrl) || SHELL_METACHARACTERS.test(url);
};

export const isPrivateNetworkHost = (hostname: string): boolean => {
  const lowerHost = hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.includes(lowerHost)) {
    return true;
  }
  return PRIVATE_IP_PATTERNS.some(pattern => pattern.test(hostname));
};
```

**Why**: SSRF protection must check both IP addresses and hostnames. Decoding URL before metachar check catches encoded injection attempts.

---

### Step 2: Update YouTubeUrlValidator with SSRF Check

**File**: `backend/src/services/youTubeUrlValidator.ts`
**Lines**: 36-39
**Action**: UPDATE

**Current code:**

```typescript
// Lines 36-39
if (!parsedUrl.hostname) {
  logger.warn('URL must contain a hostname', { url });
  return false;
}

return true;
```

**Required change:**

```typescript
if (!parsedUrl.hostname) {
  logger.warn('URL must contain a hostname', { url });
  return false;
}

if (isPrivateNetworkHost(parsedUrl.hostname)) {
  logger.warn('URL points to private/internal network - SSRF blocked', { url, hostname: parsedUrl.hostname });
  return false;
}

return true;
```

**Why**: Blocks access to internal services, loopback addresses, and link-local addresses that could be used for SSRF attacks.

---

### Step 3: Add Security-Focused Unit Tests

**File**: `backend/src/__tests__/unit/services/youTubeUrlValidator.test.ts`
**Lines**: 48-52 (append after existing tests)
**Action**: UPDATE

**Add these test cases:**

```typescript
describe('SSRF prevention', () => {
  it('should reject localhost URLs', async () => {
    expect(await validator.validate('http://localhost:8080/admin')).toBe(false);
    expect(await validator.validate('http://localhost/api')).toBe(false);
    expect(await validator.validate('https://localhost.localdomain/secret')).toBe(false);
  });

  it('should reject private IP addresses', async () => {
    const privateIps = [
      'http://127.0.0.1/admin',
      'http://127.0.0.1:8080/manage',
      'http://10.0.0.1/internal',
      'http://172.16.0.1/api',
      'http://172.31.255.1/admin',
      'http://192.168.1.1/router',
      'http://169.254.0.1/link-local',
    ];
    for (const url of privateIps) {
      expect(await validator.validate(url)).toBe(false);
    }
  });

  it('should reject .local domain names', async () => {
    expect(await validator.validate('http://printer.local/admin')).toBe(false);
    expect(await validator.validate('http://nas.localdomain/config')).toBe(false);
  });
});

describe('URL-encoded injection prevention', () => {
  it('should reject URL-encoded shell metacharacters', async () => {
    const encodedMaliciousUrls = [
      'https://youtube.com/watch?v=test%3B%20rm%20-rf%20%2F',
      'https://youtube.com/watch?v=test%26%26%20cat%20%2Fetc%2Fpasswd',
      'https://youtube.com/watch?v=test%7C%20ls%20-la',
      'https://youtube.com/watch?v=test%60whoami%60',
      'https://youtube.com/watch?v=test%24(whoami)',
    ];
    for (const url of encodedMaliciousUrls) {
      expect(await validator.validate(url)).toBe(false);
    }
  });
});

describe('edge cases', () => {
  it('should reject URLs with null bytes', async () => {
    expect(await validator.validate('https://youtube.com/watch?v=test%00 malicious')).toBe(false);
  });

  it('should reject URLs with newlines', async () => {
    expect(await validator.validate('https://youtube.com/watch?v=test\nmalicious')).toBe(false);
  });

  it('should handle IPv6 addresses appropriately', async () => {
    expect(await validator.validate('http://[::1]/admin')).toBe(false);
    expect(await validator.validate('http://[fe80::1]/link-local')).toBe(false);
  });
});
```

**Why**: Comprehensive security tests ensure SSRF and injection vectors are blocked.

---

## Patterns to Follow

**From codebase - mirror these exactly:**

```typescript
// SOURCE: backend/src/types/youtube.ts:111
// Pattern for regex constant definition
const SHELL_METACHARACTERS = /[;&|`$(){}[\]<>]/;

// SOURCE: backend/src/services/youTubeUrlValidator.ts:12-15
// Pattern for URL length check with logging
if (url.length > 2000) {
  logger.warn('URL exceeds maximum length', { url });
  return false;
}

// SOURCE: backend/src/services/youTubeUrlValidator.ts:17-20
// Pattern for security rejection with logging
if (containsShellMetacharacters(url)) {
  logger.warn('URL contains shell metacharacters - potential injection attempt', { url });
  return false;
}
```

---

## Edge Cases & Risks

| Risk/Edge Case | Mitigation      |
| -------------- | --------------- |
| IPv6 addresses | Block `[::1]` and `fe80::` variants in SSRF check |
| Internationalized domain names | Let `new URL()` handle punycode conversion |
| URL shorteners | Accept risk (yt-dlp will fail on non-media URLs anyway) |
| VPN/internal services | Block all private ranges; legitimate use cases are external URLs |
| Backslash in regex | Added to `SHELL_METACHARACTERS` to catch Windows-style paths |

---

## Validation

### Automated Checks

```bash
cd /home/runner/work/sofathek/sofathek/backend
npm run typecheck
npm run test -- --testPathPattern=youTubeUrlValidator
npm run lint
```

### Manual Verification

1. Test with `http://127.0.0.1:3010/` - should return `false`
2. Test with `https://example.com` - should return `false` (if restricting to YouTube only) OR `true` (if allowing any HTTP/HTTPS per current design)
3. Test with `https://youtube.com/watch?v=test%3B%20rm%20-rf%20%2F` - should return `false`

---

## Scope Boundaries

**IN SCOPE:**

- SSRF protection (private IP and hostname filtering)
- URL-encoded injection detection
- Security-focused unit tests
- Logging of blocked attempts

**OUT OF SCOPE (do not touch):**

- Domain allowlist/whitelist functionality (separate feature)
- Rate limiting (separate concern)
- Frontend validation changes (already restricts to YouTube)
- yt-dlp timeout configuration
- Download size limits

---

## Metadata

- **Investigated by**: GHAR
- **Timestamp**: 2026-03-23T15:30:00Z
- **Artifact**: `.claude/PRPs/issues/issue-190.md`