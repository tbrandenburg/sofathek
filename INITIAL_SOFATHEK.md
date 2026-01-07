## FEATURE:

Implement Sofathek, a self-hosted family mediathek application, building upon the established golden template repository. Transform the template's dummy frontend and backend into a fully functional Netflix-like media management system with YouTube download capabilities.

### Implementation Strategy:

**Phase 1: Core Infrastructure Adaptation**

- Adapt template's React 19 frontend for media library interface with compiler optimizations
- Extend Express 5.x backend with improved video streaming and file management APIs
- Integrate yt-dlp for YouTube video downloading with Node.js 20+ support
- Implement file system-based storage with JSON metadata

**Phase 2: Media Library System**

- Category-based video organization (movies, youtube, family, etc.)
- Metadata extraction and thumbnail generation using ffmpeg
- File system scanning and video library indexing
- JSON-based persistence for video metadata and user profiles
- **Robust Video Recognition**: Videos are recognized and playable even without accompanying metadata JSON files (auto-generated on demand)

**Phase 3: User Interface Implementation**

- Netflix-like paginated grid interface with native CSS Grid layout
- 10-theme system (6 children + 4 adult themes) with CSS custom properties
- Dark/light mode toggle with modern CSS-in-JS solutions
- Profile system without authentication (stored as JSON files)
- Mobile-optimized touch interface with Container Queries

**Phase 4: Video Streaming & Playback**

- Modern HTML5 video player with custom controls and progress tracking
- HTTP range request support for video seeking using Express 5.x streaming
- Playback resume functionality per user profile
- Recently watched tracking and storage

**Phase 5: Admin Features & YouTube Integration**

- Admin interface for YouTube URL input and download management
- yt-dlp integration with "best video + best audio" quality settings
- File operation controls (delete, move, rename videos)
- System status monitoring (storage usage, download queue)

### Technical Architecture:

**Frontend Extensions:**

- Replace template's dummy components with media library components using React 19
- Add video grid, player, and admin interfaces with modern component patterns
- Implement theming system with Tailwind CSS or styled-components v6+
- Responsive grid layout using native CSS Grid and Container Queries

**Backend Extensions:**

- Add video streaming endpoints with Express 5.x range request support
- Integrate yt-dlp via modern Node.js wrapper for YouTube downloads
- File system management APIs using Node.js 20+ fs.glob() when available
- Background job processing for download queue management

**Storage Architecture:**

- File system-based storage (no database required)
- JSON files for metadata, user profiles, and configuration
- Docker volume mounts for persistent data storage
- Category-based folder organization for videos
- **Flexible Metadata Design**: Videos can be saved without their metadata JSON files and will still be recognized and playable by the system (metadata will be auto-generated when missing)

### Development Assistance & Quality Assurance:

**MCP Integration for Development Support:**

During the implementation of Sofathek, utilize the following MCP (Model Context Protocol) tools for ensuring code quality, up-to-date libraries, and best practices:

**Context7 MCP Usage:**

- **Library Verification**: Use Context7 to verify latest versions and best practices for all libraries mentioned in this document
- **API Documentation**: Query Context7 for current API patterns and breaking changes in React 19, Express 5.x, and other dependencies
- **Code Examples**: Retrieve up-to-date code examples and implementation patterns for video streaming, theming, and component architecture
- **Best Practices**: Consult Context7 for modern development practices in areas like accessibility, performance optimization, and security

**Firecrawl MCP Usage:**

- **Documentation Updates**: Use Firecrawl to verify that all external documentation links are current and accessible
- **Library Status**: Scrape official library repositories and documentation sites to check for deprecations, security updates, or major version changes
- **Community Resources**: Gather current community best practices and real-world implementation examples for media streaming applications
- **Troubleshooting**: Research solutions for specific implementation challenges by scraping relevant technical forums and documentation

**When to Use MCP Tools:**

1. **Before Implementation**: Verify all library versions and check for breaking changes
2. **During Development**: Resolve doubts about API usage, component patterns, or configuration
3. **Code Review**: Validate that implementations follow current best practices
4. **Troubleshooting**: Research solutions for specific technical challenges
5. **Documentation Updates**: Ensure all references and links remain current and accurate

**MCP Query Examples:**

```bash
# Context7 queries
"React 19 video component optimization patterns"
"Express 5.x file streaming best practices"
"Modern CSS Grid responsive video layouts"

# Firecrawl queries
"yt-dlp latest installation documentation"
"Vidstack React player current API reference"
"Tailwind CSS grid system updates"
```

This integrated approach ensures that Sofathek is built with the most current technologies, follows modern best practices, and maintains high code quality throughout development.

### 🧪 Rigorous Quality Assurance & Testing Framework:

**🚨 CEO-LEVEL QUALITY STANDARDS - ZERO TOLERANCE POLICY**

**NO FEATURE IS COMPLETE WITHOUT 100% PASSING TESTS. NO EXCEPTIONS.**

**Playwright MCP Integration for Comprehensive Testing:**

Every phase with frontend availability must implement and pass a complete Playwright test suite before phase completion. This ensures enterprise-grade quality and prevents any untested or broken functionality from reaching production.

**Phase-Based Testing Strategy:**

**Phase 1: Core Infrastructure Testing**
_Testing begins as soon as basic frontend is available_

**Playwright Test Categories:**

- **Smoke Tests**: Basic application startup and health checks
- **Infrastructure Tests**: API endpoints respond correctly
- **Integration Tests**: Frontend-backend communication
- **Security Tests**: Authentication, input validation, HTTPS enforcement

**Mandatory Test Cases:**

```typescript
// SUNNY DAY SCENARIOS
✅ Application starts without errors
✅ All API endpoints return expected status codes
✅ Frontend renders without console errors
✅ Basic navigation works between pages
✅ Docker containers start and communicate properly

// RAINY DAY SCENARIOS
✅ Application handles network disconnection gracefully
✅ API returns proper error responses for invalid inputs
✅ Frontend shows user-friendly error messages
✅ Application recovers from temporary service failures
✅ Resource limits don't crash the application
```

**Phase 2: Media Library System Testing**
_Complete end-to-end testing with real video files and ffmpeg_

**Full System Integration Tests:**

- **Video Processing Pipeline**: Upload → ffmpeg processing → thumbnail generation → metadata extraction
- **File System Operations**: Video scanning, categorization, storage management
- **Metadata Management**: JSON persistence, video library indexing

**Mandatory Test Cases:**

```typescript
// SUNNY DAY SCENARIOS
✅ Upload video file and verify processing pipeline
✅ ffmpeg generates thumbnails correctly (verify file exists + format)
✅ Video metadata extracted and stored in JSON
✅ File system scanning discovers all videos
✅ Category organization works correctly
✅ Video library displays all processed videos

// RAINY DAY SCENARIOS
✅ Handle corrupted video files gracefully
✅ ffmpeg failure doesn't crash application
✅ Disk full scenarios handled properly
✅ Invalid video formats rejected with user feedback
✅ Large video files processed without memory leaks
✅ Concurrent uploads handled safely
```

**Phase 3: UI/UX & Theming Testing**
_Visual regression testing and accessibility compliance_

**Design & Color Testing:**

- **Visual Regression Tests**: Screenshot comparison for all 10 themes
- **Responsive Design Tests**: Grid layouts on mobile/tablet/desktop
- **Accessibility Tests**: WCAG 2.1 AA compliance verification
- **Performance Tests**: Core Web Vitals measurements

**Mandatory Test Cases:**

```typescript
// SUNNY DAY SCENARIOS
✅ All 10 themes render correctly (visual regression tests)
✅ Dark/light mode toggle works for each theme
✅ CSS Grid responsive layout adapts to all screen sizes
✅ Netflix-like grid displays videos properly
✅ Profile switching maintains theme preferences
✅ Color schemes match design specifications exactly
✅ Neon glow effects render correctly across browsers

// RAINY DAY SCENARIOS
✅ Broken theme data doesn't crash application
✅ Missing theme files fall back to default
✅ Extremely narrow/wide screens handled gracefully
✅ High contrast mode accessibility maintained
✅ Color blindness accessibility verified
✅ Theme switching during video playback works
```

**Phase 4: Video Streaming & Playback Testing**
_Performance-critical testing with real video streams_

**Video Player Integration Tests:**

- **Streaming Performance**: Range requests, seeking, buffering
- **Playback Controls**: Play/pause, volume, fullscreen, progress
- **Resume Functionality**: Cross-session playback continuation
- **Multi-format Support**: Various video codecs and resolutions

**Mandatory Test Cases:**

```typescript
// SUNNY DAY SCENARIOS
✅ Video streaming starts within 2 seconds
✅ Seeking works accurately (±1 second precision)
✅ Resume playback from exact last position
✅ Progress tracking saves correctly per user profile
✅ Multiple video formats play correctly (mp4, webm, mkv)
✅ Fullscreen mode works on all devices
✅ Volume controls function properly
✅ Video quality adapts to network conditions

// RAINY DAY SCENARIOS
✅ Network interruption resumes streaming gracefully
✅ Corrupted video segments handled without crashes
✅ Seek beyond video length handled properly
✅ Multiple simultaneous streams don't overload server
✅ Browser back/forward during playback works
✅ Page refresh during playback resumes correctly
✅ Mobile device rotation maintains playback state
```

**Phase 5: YouTube Integration & Admin Testing**
_Complete yt-dlp integration with download management_

**End-to-End YouTube Download Testing:**

- **yt-dlp Integration**: Real YouTube downloads with quality selection
- **Download Queue**: Concurrent downloads, prioritization, error handling
- **Admin Interface**: Complete file management operations
- **System Monitoring**: Storage usage, download progress, health checks

**Mandatory Test Cases:**

```typescript
// SUNNY DAY SCENARIOS
✅ YouTube URL download completes successfully
✅ Video quality selection works (best, 1080p, 720p, etc.)
✅ Thumbnail generation during download
✅ Downloaded video appears in library automatically
✅ Download queue manages multiple URLs correctly
✅ Progress tracking shows real-time download status
✅ Admin interface allows video deletion/moving/renaming
✅ Storage monitoring shows accurate disk usage

// RAINY DAY SCENARIOS
✅ Invalid YouTube URLs show user-friendly errors
✅ Geo-blocked videos handled gracefully
✅ Network failures pause/resume downloads correctly
✅ Disk full stops downloads and shows warning
✅ yt-dlp failures don't crash admin interface
✅ Concurrent download limits prevent system overload
✅ Malformed video metadata doesn't break library
✅ Large playlist downloads can be cancelled safely
```

**Continuous Testing Requirements:**

**🔄 Validation Loops - Self-Critical Quality Assurance:**

1. **Pre-Development Validation**:
   - All test scenarios planned and documented
   - Test data prepared (sample videos, edge cases)
   - Testing environment mirrors production exactly

2. **During Development Validation**:
   - Tests written alongside feature development (TDD approach)
   - Continuous integration runs all tests on every commit
   - No feature branch merges without 100% test pass rate

3. **Post-Development Validation**:
   - Full regression test suite execution
   - Performance benchmarking against baseline metrics
   - Cross-browser testing (Chrome, Firefox, Safari, Edge)
   - Mobile device testing (iOS, Android)

4. **Production Readiness Validation**:
   - Load testing with realistic user scenarios
   - Security penetration testing
   - Disaster recovery testing
   - Monitoring and alerting validation

**Quality Gate Enforcement:**

**❌ PHASE COMPLETION BLOCKERS:**

- Any failing Playwright test
- Console errors or warnings
- Accessibility violations
- Performance regression
- Visual regression failures
- Security vulnerabilities
- Untested code paths

**✅ PHASE COMPLETION CRITERIA:**

- 100% Playwright test pass rate
- Zero console errors/warnings
- WCAG 2.1 AA compliance verified
- Core Web Vitals meet Google standards
- Visual regression tests pass
- Security scans clean
- Performance benchmarks met or exceeded

**Playwright MCP Commands for Quality Assurance:**

```bash
# Test execution commands
npm run test:e2e                    # Full end-to-end test suite
npm run test:visual-regression      # Theme and design tests
npm run test:accessibility         # WCAG compliance tests
npm run test:performance           # Core Web Vitals benchmarking
npm run test:security             # Security and penetration tests

# Quality validation commands
npm run validate:phase1           # Phase 1 completion validation
npm run validate:phase2           # Phase 2 completion validation
npm run validate:phase3           # Phase 3 completion validation
npm run validate:phase4           # Phase 4 completion validation
npm run validate:phase5           # Phase 5 completion validation

# CEO quality report
npm run quality:report            # Comprehensive quality dashboard
```

**Testing Infrastructure Requirements:**

- **Real Testing Environment**: Full Docker setup with actual yt-dlp, ffmpeg, video files
- **Test Data Management**: Curated video library for consistent testing
- **CI/CD Integration**: Automated testing on every commit and deployment
- **Quality Dashboards**: Real-time visibility into test results and system health
- **Performance Baselines**: Established metrics for regression detection

**CEO Quality Commitment:**

> **"Every feature must be bulletproof. Every user journey must be tested. Every edge case must be handled. No compromises on quality. No excuses for broken functionality. The test suite is our promise of excellence."**

This testing framework ensures that Sofathek meets the highest professional standards, with comprehensive coverage of all functionality, robust error handling, and enterprise-grade reliability.

### 🔥 ENHANCED RIGOROUS PLAYWRIGHT MCP IMPLEMENTATION:

**🚨 ULTRA-STRICT CEO ENFORCEMENT - MAXIMUM RIGOR APPLIED**

**ZERO-DEFECT POLICY: Every single user interaction must be validated through automated Playwright tests. No manual verification accepted. No assumptions allowed.**

**Step-by-Step User Journey Testing Implementation:**

**Phase 1: Infrastructure Validation (Frontend Available)**

**User Journey 1: Application Startup & Health**

```typescript
// MANDATORY TEST: application-startup.spec.ts
test.describe('Application Startup Journey', () => {
  test('Complete startup validation', async ({ page }) => {
    // SUNNY DAY: Perfect startup
    await page.goto('/');
    await expect(page).toHaveTitle(/Sofathek/);
    await expect(page.locator('[data-testid="app-container"]')).toBeVisible();
    await expect(page.locator('.loading')).not.toBeVisible();

    // VALIDATION: No console errors
    const logs = await page.evaluate(() => console.error.toString());
    expect(logs).not.toContain('error');

    // RAINY DAY: Network failure recovery
    await page.route('**/*', route => route.abort());
    await page.reload();
    await expect(page.locator('[data-testid="network-error"]')).toBeVisible();

    // RECOVERY: Network restoration
    await page.unroute('**/*');
    await page.click('[data-testid="retry-button"]');
    await expect(page.locator('[data-testid="app-container"]')).toBeVisible();
  });
});
```

**User Journey 2: API Communication**

```typescript
// MANDATORY TEST: api-communication.spec.ts
test.describe('API Communication Journey', () => {
  test('Complete API validation', async ({ page }) => {
    // SUNNY DAY: All endpoints respond
    const response = await page.request.get('/api/health');
    expect(response.ok()).toBeTruthy();

    const profilesResponse = await page.request.get('/api/profiles');
    expect(profilesResponse.ok()).toBeTruthy();

    // RAINY DAY: API failures
    await page.route('/api/**', route => route.fulfill({ status: 500 }));
    await page.goto('/');
    await expect(page.locator('[data-testid="api-error"]')).toBeVisible();

    // VALIDATION: Error message user-friendly
    const errorText = await page.locator('[data-testid="error-message"]').textContent();
    expect(errorText).not.toContain('500');
    expect(errorText).toContain('temporarily unavailable');
  });
});
```

**Phase 2: Media Library System (Real Tool Integration)**

**User Journey 3: Video Upload & Processing**

```typescript
// MANDATORY TEST: video-processing.spec.ts
test.describe('Video Processing Journey', () => {
  test('Complete video pipeline validation', async ({ page }) => {
    // SETUP: Real test video file
    const videoFile = './tests/fixtures/videos/valid/sample-1080p.mp4';

    // SUNNY DAY: Upload and processing
    await page.goto('/admin');
    await page.locator('[data-testid="upload-button"]').click();
    await page.locator('input[type="file"]').setInputFiles(videoFile);

    // VALIDATION: Upload progress shown
    await expect(page.locator('[data-testid="upload-progress"]')).toBeVisible();

    // VALIDATION: ffmpeg processing starts
    await expect(page.locator('[data-testid="processing-status"]')).toContainText('Processing');

    // VALIDATION: Thumbnail generated (real ffmpeg test)
    await page.waitForSelector('[data-testid="thumbnail-generated"]', { timeout: 30000 });
    const thumbnailSrc = await page.locator('[data-testid="video-thumbnail"]').getAttribute('src');
    expect(thumbnailSrc).toMatch(/\.webp$/);

    // VALIDATION: Metadata extracted
    const duration = await page.locator('[data-testid="video-duration"]').textContent();
    expect(duration).toMatch(/\d+:\d+/);

    // VALIDATION: Video appears in library
    await page.goto('/library');
    await expect(page.locator('[data-testid="video-card"]')).toBeVisible();

    // RAINY DAY: Corrupted video upload
    const corruptedFile = './tests/fixtures/videos/corrupted/broken.mp4';
    await page.goto('/admin');
    await page.locator('input[type="file"]').setInputFiles(corruptedFile);
    await expect(page.locator('[data-testid="processing-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid video format');
  });
});
```

**User Journey 4: YouTube Download Integration**

```typescript
// MANDATORY TEST: youtube-download.spec.ts
test.describe('YouTube Download Journey', () => {
  test('Complete yt-dlp integration validation', async ({ page }) => {
    // SETUP: Use real YouTube test URL (short video)
    const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

    // SUNNY DAY: YouTube download
    await page.goto('/admin');
    await page.locator('[data-testid="youtube-url-input"]').fill(testUrl);
    await page.locator('[data-testid="download-button"]').click();

    // VALIDATION: yt-dlp starts
    await expect(page.locator('[data-testid="download-status"]')).toContainText('Downloading');

    // VALIDATION: Progress tracking
    await page.waitForSelector('[data-testid="download-progress"]');
    const progressBar = page.locator('[data-testid="progress-bar"]');
    await expect(progressBar).toBeVisible();

    // VALIDATION: Quality selection works
    await page.locator('[data-testid="quality-selector"]').selectOption('720p');
    expect(await page.locator('[data-testid="selected-quality"]').textContent()).toBe('720p');

    // VALIDATION: Download completes (real yt-dlp test)
    await page.waitForSelector('[data-testid="download-complete"]', { timeout: 120000 });

    // VALIDATION: Video processed and available
    await page.goto('/library');
    await expect(page.locator('[data-testid="video-card"]').first()).toBeVisible();

    // RAINY DAY: Invalid YouTube URL
    await page.goto('/admin');
    await page.locator('[data-testid="youtube-url-input"]').fill('invalid-url');
    await page.locator('[data-testid="download-button"]').click();
    await expect(page.locator('[data-testid="url-error"]')).toContainText('Invalid YouTube URL');

    // RAINY DAY: Geo-blocked video
    const blockedUrl = 'https://www.youtube.com/watch?v=BLOCKED123';
    await page.locator('[data-testid="youtube-url-input"]').fill(blockedUrl);
    await page.locator('[data-testid="download-button"]').click();
    await expect(page.locator('[data-testid="geo-block-error"]')).toContainText('not available in your region');
  });
});
```

**Phase 3: UI/UX & Design Validation (Pixel-Perfect Testing)**

**User Journey 5: Theme System Validation**

```typescript
// MANDATORY TEST: theme-validation.spec.ts
test.describe('Theme System Journey', () => {
  test('All 10 themes visual validation', async ({ page }) => {
    const themes = [
      'cyberpunk-purple',
      'rainbow-neon',
      'ocean-blue',
      'forest-green',
      'sunset-orange',
      'midnight-dark',
      'cotton-candy',
      'galaxy-space',
      'retro-80s',
      'minimalist-white',
    ];

    for (const theme of themes) {
      // SUNNY DAY: Theme application
      await page.goto('/');
      await page.locator('[data-testid="theme-selector"]').selectOption(theme);

      // VALIDATION: CSS custom properties applied
      const primaryColor = await page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue('--primary-color')
      );
      expect(primaryColor).toBeTruthy();

      // VALIDATION: Visual regression test (pixel-perfect)
      await expect(page).toHaveScreenshot(`theme-${theme}-desktop.png`);

      // VALIDATION: Mobile responsive
      await page.setViewportSize({ width: 375, height: 667 });
      await expect(page).toHaveScreenshot(`theme-${theme}-mobile.png`);

      // VALIDATION: Dark mode toggle
      await page.locator('[data-testid="dark-mode-toggle"]').click();
      await expect(page).toHaveScreenshot(`theme-${theme}-dark.png`);

      // VALIDATION: Neon glow effects
      const neonElement = page.locator('[data-testid="neon-effect"]');
      const boxShadow = await neonElement.evaluate(el => getComputedStyle(el).getPropertyValue('box-shadow'));
      expect(boxShadow).toContain('0px 0px');

      await page.setViewportSize({ width: 1920, height: 1080 });
    }

    // RAINY DAY: Invalid theme data
    await page.evaluate(() => {
      localStorage.setItem('selectedTheme', 'invalid-theme');
    });
    await page.reload();

    // VALIDATION: Falls back to default theme
    const fallbackTheme = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--primary-color')
    );
    expect(fallbackTheme).toBe('#8B5CF6'); // Default cyberpunk-purple
  });
});
```

**User Journey 6: Accessibility Compliance**

```typescript
// MANDATORY TEST: accessibility-validation.spec.ts
test.describe('Accessibility Journey', () => {
  test('WCAG 2.1 AA compliance validation', async ({ page }) => {
    // VALIDATION: Keyboard navigation
    await page.goto('/');
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toBeVisible();

    // VALIDATION: Screen reader compatibility
    const videoCard = page.locator('[data-testid="video-card"]').first();
    await expect(videoCard).toHaveAttribute('role', 'button');
    await expect(videoCard).toHaveAttribute('aria-label');

    // VALIDATION: Color contrast ratios
    const buttonElement = page.locator('[data-testid="play-button"]');
    const contrast = await buttonElement.evaluate(el => {
      const style = getComputedStyle(el);
      return { bg: style.backgroundColor, text: style.color };
    });

    // Validate contrast ratio meets WCAG AA (4.5:1)
    const contrastRatio = await page.evaluate(({ bg, text }) => {
      // Simplified contrast calculation - use actual library in real implementation
      return calculateContrastRatio(bg, text);
    }, contrast);
    expect(contrastRatio).toBeGreaterThan(4.5);

    // VALIDATION: Focus indicators visible
    await page.keyboard.press('Tab');
    const focusOutline = await page.locator(':focus').evaluate(el => getComputedStyle(el).getPropertyValue('outline'));
    expect(focusOutline).not.toBe('none');
  });
});
```

**Phase 4: Video Streaming Performance**

**User Journey 7: Video Playback Validation**

```typescript
// MANDATORY TEST: video-streaming.spec.ts
test.describe('Video Streaming Journey', () => {
  test('Complete playback performance validation', async ({ page }) => {
    // SETUP: Real video file available
    await page.goto('/library');
    await page.locator('[data-testid="video-card"]').first().click();

    // SUNNY DAY: Video loads and plays
    const video = page.locator('video');
    await expect(video).toBeVisible();

    // VALIDATION: Video loads within 2 seconds
    const startTime = Date.now();
    await video.evaluate(v => v.play());
    await video.waitForEvent('canplaythrough');
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(2000);

    // VALIDATION: Seeking accuracy (±1 second)
    await video.evaluate(v => {
      v.currentTime = 30;
    });
    await page.waitForTimeout(100);
    const currentTime = await video.evaluate(v => v.currentTime);
    expect(Math.abs(currentTime - 30)).toBeLessThan(1);

    // VALIDATION: Progress tracking
    await video.evaluate(v => {
      v.currentTime = 45;
    });
    await page.waitForTimeout(500);
    const savedProgress = await page.evaluate(() => localStorage.getItem('video-progress'));
    expect(JSON.parse(savedProgress).currentTime).toBeCloseTo(45, 0);

    // VALIDATION: Resume functionality
    await page.reload();
    await video.waitForLoadState();
    const resumedTime = await video.evaluate(v => v.currentTime);
    expect(Math.abs(resumedTime - 45)).toBeLessThan(2);

    // RAINY DAY: Network interruption
    await page.route('**/*.mp4', route => route.abort());
    await video.evaluate(v => v.play());
    await expect(page.locator('[data-testid="network-error"]')).toBeVisible();

    // RECOVERY: Network restoration
    await page.unroute('**/*.mp4');
    await page.locator('[data-testid="retry-playback"]').click();
    await expect(video).toBeVisible();
    await expect(video.evaluate(v => v.error)).toBeNull();
  });
});
```

**Phase 5: Admin & System Validation**

**User Journey 8: Complete Admin Interface**

```typescript
// MANDATORY TEST: admin-interface.spec.ts
test.describe('Admin Interface Journey', () => {
  test('Complete file management validation', async ({ page }) => {
    await page.goto('/admin');

    // SUNNY DAY: File operations
    await expect(page.locator('[data-testid="video-list"]')).toBeVisible();

    // VALIDATION: Delete operation
    const initialCount = await page.locator('[data-testid="video-item"]').count();
    await page.locator('[data-testid="delete-button"]').first().click();
    await page.locator('[data-testid="confirm-delete"]').click();

    const newCount = await page.locator('[data-testid="video-item"]').count();
    expect(newCount).toBe(initialCount - 1);

    // VALIDATION: Move operation
    await page.locator('[data-testid="move-button"]').first().click();
    await page.locator('[data-testid="category-selector"]').selectOption('movies');
    await page.locator('[data-testid="confirm-move"]').click();

    // Verify moved to movies category
    await page.goto('/library/movies');
    await expect(page.locator('[data-testid="video-card"]').first()).toBeVisible();

    // VALIDATION: System monitoring
    await page.goto('/admin/system');
    const storageUsage = await page.locator('[data-testid="storage-usage"]').textContent();
    expect(storageUsage).toMatch(/\d+(\.\d+)?\s*(GB|MB)/);

    const downloadQueue = await page.locator('[data-testid="queue-length"]').textContent();
    expect(parseInt(downloadQueue)).toBeGreaterThanOrEqual(0);

    // RAINY DAY: Disk full simulation
    await page.route('/api/admin/storage', route =>
      route.fulfill({
        json: { available: 0, total: 1000, used: 1000 },
      })
    );
    await page.reload();
    await expect(page.locator('[data-testid="disk-full-warning"]')).toBeVisible();
  });
});
```

**🔄 SELF-CRITICAL VALIDATION LOOPS:**

**Validation Loop 1: Pre-Test Validation**

```bash
# MANDATORY: Run before every test execution
npm run validate:pre-test
# Checks:
# ✅ Test environment setup correctly
# ✅ All test fixtures available
# ✅ Docker containers running
# ✅ Test database clean state
# ✅ No hanging processes
```

**Validation Loop 2: Test Execution Validation**

```bash
# MANDATORY: Continuous monitoring during tests
npm run validate:during-test
# Checks:
# ✅ Memory usage within limits
# ✅ No test timeouts
# ✅ Screenshot generation working
# ✅ Network conditions stable
# ✅ Container health maintained
```

**Validation Loop 3: Post-Test Validation**

```bash
# MANDATORY: After every test run
npm run validate:post-test
# Checks:
# ✅ All test artifacts generated
# ✅ Performance metrics collected
# ✅ Visual regression images saved
# ✅ Test coverage 100%
# ✅ No resource leaks detected
```

**Validation Loop 4: CEO Quality Validation**

```bash
# MANDATORY: Before phase sign-off
npm run validate:ceo-quality
# Checks:
# ✅ Zero failing tests
# ✅ Zero console warnings
# ✅ Zero accessibility violations
# ✅ Performance benchmarks met
# ✅ Visual regression zero diff
# ✅ Security scans clean
```

**🚨 ULTRA-STRICT ENFORCEMENT MECHANISMS:**

**Enforcement 1: Development Blockade**

```bash
# NO development allowed if tests fail
if [ "$(npm run test:validate)" != "0" ]; then
  echo "🚨 DEVELOPMENT BLOCKED: Fix all test failures first"
  exit 1
fi
```

**Enforcement 2: Commit Blockade**

```bash
# NO commits allowed without 100% test pass
pre-commit:
  - npm run test:all
  - npm run validate:quality-gates
  - npm run test:visual-regression
# Exit code must be 0 or commit rejected
```

**Enforcement 3: Phase Progression Blockade**

```typescript
// NO phase completion without validation
async function validatePhaseCompletion(phase: number): Promise<boolean> {
  const testResults = await runAllTests(phase);
  const visualRegression = await runVisualTests(phase);
  const accessibility = await runAccessibilityTests(phase);
  const performance = await runPerformanceTests(phase);

  if (!testResults.allPassed) throw new Error(`Phase ${phase} BLOCKED: Test failures detected`);
  if (!visualRegression.allPassed) throw new Error(`Phase ${phase} BLOCKED: Visual regression failures`);
  if (!accessibility.allPassed) throw new Error(`Phase ${phase} BLOCKED: Accessibility violations`);
  if (!performance.benchmarksMet) throw new Error(`Phase ${phase} BLOCKED: Performance regression`);

  return true; // Only returns if EVERYTHING passes
}
```

**Enforcement 4: CEO Dashboard Enforcement**

```typescript
// Real-time quality dashboard for CEO visibility
interface CEOQualityDashboard {
  overallHealth: 'GREEN' | 'YELLOW' | 'RED';
  testPassRate: number; // Must be 100%
  visualRegressionStatus: 'PASS' | 'FAIL';
  accessibilityScore: number; // Must be 100%
  performanceScore: number; // Must meet baselines
  securityStatus: 'SECURE' | 'VULNERABLE';
  phaseCompletionStatus: Record<number, 'COMPLETED' | 'BLOCKED' | 'IN_PROGRESS'>;
}

// CEO alert system
if (dashboard.overallHealth !== 'GREEN') {
  sendCEOAlert('🚨 QUALITY DEGRADATION DETECTED - IMMEDIATE ACTION REQUIRED');
}
```

**🎯 MANDATORY TEST COVERAGE REQUIREMENTS:**

- **100% Line Coverage**: Every single line of code tested
- **100% Branch Coverage**: Every conditional path tested
- **100% Function Coverage**: Every function tested
- **100% Statement Coverage**: Every statement tested
- **100% User Journey Coverage**: Every user interaction tested
- **100% Error Path Coverage**: Every error condition tested
- **100% Integration Coverage**: Every service interaction tested
- **100% Visual Coverage**: Every UI state screenshot tested

**CEO FINAL VALIDATION COMMAND:**

```bash
npm run ceo:final-validation
# This command must return exit code 0 or the entire phase is REJECTED
# NO EXCEPTIONS. NO WORKAROUNDS. NO COMPROMISES.
```

This enhanced framework provides the ultimate rigor demanded by CEO-level quality standards, with zero tolerance for any untested functionality or quality degradation.

### Enhanced Directory Structure:

```
sofathek/ (built on template)
├── Makefile                    # Extended with Sofathek-specific commands
├── README.md                   # Sofathek-specific documentation
├── AGENTS.md                   # AI collaboration for media app context
├── docker-compose.yml          # Configured for media streaming
├── Dockerfile                  # Includes yt-dlp, ffmpeg, and Node.js 20
├── tests/                      # 🧪 COMPREHENSIVE TESTING SUITE
│   ├── playwright/             # Playwright MCP integration tests
│   │   ├── e2e/               # End-to-end user journey tests
│   │   │   ├── phase1-infrastructure.spec.ts    # Core infrastructure tests
│   │   │   ├── phase2-media-library.spec.ts     # Media processing tests
│   │   │   ├── phase3-ui-theming.spec.ts        # UI/UX and design tests
│   │   │   ├── phase4-video-streaming.spec.ts   # Video playback tests
│   │   │   └── phase5-youtube-admin.spec.ts     # YouTube & admin tests
│   │   ├── visual-regression/  # Screenshot comparison tests
│   │   │   ├── themes/        # All 10 theme visual tests
│   │   │   ├── responsive/    # Mobile/tablet/desktop layouts
│   │   │   └── baselines/     # Reference screenshots
│   │   ├── accessibility/     # WCAG 2.1 AA compliance tests
│   │   ├── performance/       # Core Web Vitals benchmarking
│   │   └── security/          # Penetration and security tests
│   ├── fixtures/              # Test data and sample files
│   │   ├── videos/           # Sample video files for testing
│   │   │   ├── valid/        # Various formats and sizes
│   │   │   ├── corrupted/    # Edge case testing files
│   │   │   └── large/        # Performance testing files
│   │   ├── metadata/         # Sample JSON metadata
│   │   └── profiles/         # Test user profiles
│   ├── utils/                # Testing utilities and helpers
│   │   ├── test-setup.ts     # Global test configuration
│   │   ├── video-helpers.ts  # Video processing test utilities
│   │   ├── theme-helpers.ts  # Theme and design test utilities
│   │   └── quality-gates.ts  # Automated quality validation
│   └── config/              # Testing configuration files
│       ├── playwright.config.ts        # Playwright configuration
│       ├── quality-gates.json         # CEO quality standards
│       └── performance-baselines.json # Performance benchmarks
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── VideoGrid/      # Netflix-like video grid with CSS Grid
│   │   │   ├── VideoPlayer/    # Modern HTML5 player with Vidstack
│   │   │   ├── ThemeSelector/  # Profile theme management
│   │   │   ├── AdminPanel/     # YouTube download interface
│   │   │   └── ProfileManager/ # User profile switching
│   │   ├── pages/
│   │   │   ├── Library/        # Main video library view
│   │   │   ├── Category/       # Category-specific views
│   │   │   ├── Player/         # Video playback page
│   │   │   └── Admin/          # Administration interface
│   │   ├── services/
│   │   │   ├── api.js          # Video and download API calls
│   │   │   ├── player.js       # Video player utilities
│   │   │   └── themes.js       # Modern theme management system
│   │   └── styles/
│   │       └── themes/         # CSS custom properties for 10 themes
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── videos.js       # Express 5.x video streaming APIs
│   │   │   ├── downloads.js    # YouTube download management
│   │   │   ├── profiles.js     # User profile management
│   │   │   └── admin.js        # Administrative operations
│   │   ├── services/
│   │   │   ├── ytdlp.js        # YouTube download integration
│   │   │   ├── ffmpeg.js       # Video processing and thumbnails
│   │   │   ├── scanner.js      # File system scanning with modern APIs
│   │   │   └── metadata.js     # Video metadata management
│   │   └── middleware/
│   │       ├── streaming.js    # Video streaming with Express 5.x
│   │       └── fileOps.js      # File operation utilities
└── data/                       # Docker volume mount points
    ├── videos/                 # Video library storage
    ├── profiles/               # User profile JSON files
    ├── config/                 # Application configuration
    └── downloads/              # Temporary download directory
```

## EXAMPLES:

**Modern Video Grid Component (React 19):**

```jsx
import { memo } from 'react';
import { useTheme } from './hooks/useTheme';

const VideoGrid = memo(({ category, videos, profile }) => {
  const theme = useTheme(profile.selectedTheme);

  return (
    <div
      className="video-grid"
      style={{
        '--grid-columns': 'repeat(auto-fill, minmax(300px, 1fr))',
        '--grid-gap': theme.spacing.medium,
        display: 'grid',
        gridTemplateColumns: 'var(--grid-columns)',
        gap: 'var(--grid-gap)',
        padding: theme.spacing.large,
      }}
    >
      {videos.map(video => (
        <VideoCard
          key={video.id}
          video={video}
          watchProgress={profile.watchHistory[video.id]}
          onPlay={handleVideoPlay}
        />
      ))}
    </div>
  );
});
```

**YouTube Download API (Express 5.x):**

```javascript
// POST /api/downloads
app.post('/api/downloads', async (req, res) => {
  const { url, category } = req.body;

  try {
    const downloadJob = await ytdlpService.downloadVideo(url, {
      quality: 'best[ext=mp4]',
      outputDir: `/app/data/videos/${category}`,
      generateThumbnail: true,
      format: 'bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4] / bv*+ba/b',
    });

    res.json({ jobId: downloadJob.id, status: 'queued' });
  } catch (error) {
    console.error('Download error:', error);
    res.status(400).json({ error: error.message });
  }
});
```

**Modern Video Streaming Endpoint (Express 5.x):**

```javascript
// GET /api/videos/:id/stream
app.get('/api/videos/:id/stream', (req, res) => {
  const { id } = req.params;
  const videoPath = getVideoPath(id);

  // Use Express 5.x improved sendFile with proper streaming
  res.sendFile(
    videoPath,
    {
      root: process.cwd(),
      headers: {
        'Content-Type': 'video/mp4',
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=31536000',
      },
    },
    err => {
      if (err) {
        console.error('Streaming error:', err);
        if (!res.headersSent) {
          res.status(err.status || 500).end();
        }
      }
    }
  );
});
```

**Modern Theme System with CSS Custom Properties:**

```javascript
const themes = {
  'cyberpunk-purple': {
    '--primary-color': '#8B5CF6',
    '--secondary-color': '#A855F7',
    '--accent-color': '#EC4899',
    '--neon-glow': '0 0 20px #8B5CF6',
    '--background-color': '#1A1625',
    '--text-color': '#FFFFFF',
    '--surface-color': '#2A1F3D',
  },
  'rainbow-neon': {
    '--primary-color': '#FF6B6B',
    '--secondary-color': '#4ECDC4',
    '--accent-color': '#45B7D1',
    '--neon-glow': '0 0 15px #FF6B6B',
    '--background-color': '#2C1810',
    '--text-color': '#FFFFFF',
    '--surface-color': '#3D2317',
  },
  // ... 8 more themes
};

// Apply theme using CSS custom properties
const applyTheme = themeName => {
  const theme = themes[themeName];
  const root = document.documentElement;

  Object.entries(theme).forEach(([property, value]) => {
    root.style.setProperty(property, value);
  });
};
```

**Video Metadata JSON (Enhanced):**

```json
{
  "id": "awesome-tutorial-2024",
  "title": "Awesome Tutorial Video",
  "duration": 1847,
  "fileSize": 125000000,
  "dateAdded": "2024-01-07T10:30:00Z",
  "resolution": "1920x1080",
  "codec": "h264",
  "bitrate": 2500,
  "category": "youtube",
  "source": "https://youtube.com/watch?v=...",
  "thumbnail": "thumbnail.webp",
  "description": "An amazing tutorial about...",
  "tags": ["tutorial", "educational", "tech"],
  "chapters": [
    { "title": "Introduction", "start": 0 },
    { "title": "Main Content", "start": 120 }
  ],
  "subtitles": ["en", "es"],
  "accessibility": {
    "hasClosedCaptions": true,
    "hasAudioDescription": false
  }
}
```

**Note**: This metadata JSON file is optional. Videos can exist without their corresponding metadata files and will still be recognized, scanned, and playable by Sofathek. When metadata is missing, the system will automatically extract basic information (duration, resolution, codec) from the video file itself and generate thumbnails on demand.

## DOCUMENTATION:

**Media Streaming & Processing:**

- https://github.com/yt-dlp/yt-dlp - Modern YouTube downloader (yt-dlp official)
- https://github.com/fluent-ffmpeg/node-fluent-ffmpeg - FFmpeg integration for Node.js
- https://web.dev/streams/ - Modern streaming APIs and best practices

**Frontend Media Components:**

- https://www.vidstack.io/docs/player/components/react - Modern, accessible video player
- https://developer.mozilla.org/en-US/docs/Web/HTML/Element/video - HTML5 video element reference
- https://plyr.io/docs/react - Lightweight, accessible video player alternative

**Modern CSS & Styling:**

- https://tailwindcss.com/docs - Utility-first CSS framework
- https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout - Native CSS Grid
- https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_container_queries - Container Queries for responsive design

**File System & Storage:**

- https://nodejs.org/api/fs.html - Node.js file system operations
- https://github.com/sindresorhus/globby - File pattern matching
- https://docs.docker.com/storage/volumes/ - Docker volume persistence

**UI/UX for Media Applications:**

- https://ui.shadcn.com/ - Modern React component library
- https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout/Basic_concepts_of_grid_layout - CSS Grid fundamentals
- https://styled-components.com/docs/advanced#theming - Advanced theming patterns

**Express.js & Backend:**

- https://expressjs.com/en/5x/api.html - Express 5.x API documentation
- https://nodejs.org/api/stream.html - Node.js streams for video handling
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Range_requests - HTTP range requests

**YouTube Integration:**

- https://github.com/yt-dlp/yt-dlp - yt-dlp official documentation
- https://github.com/distube/ytdl-core - Modern YouTube library alternative
- https://developers.google.com/youtube/v3 - YouTube API reference

## OTHER CONSIDERATIONS:

**Performance & Scalability:**

- Lazy loading for video thumbnails with Intersection Observer API
- WebP/AVIF thumbnails for better compression
- Service Workers for offline video caching
- Memory management for large video collections using streaming APIs
- Progressive video loading with modern video codecs (AV1, HEVC)

**User Experience:**

- Keyboard shortcuts using modern KeyboardEvent APIs
- Drag-and-drop with File System Access API (when available)
- Batch operations with Web Workers for non-blocking UI
- Advanced search with fuzzy matching algorithms
- WCAG 2.1 AA compliance for accessibility

**Content Management:**

- Duplicate video detection using perceptual hashing
- Automatic metadata extraction with machine learning
- Batch thumbnail generation with WebAssembly FFmpeg
- Video quality assessment using modern metrics
- Smart storage cleanup with usage analytics

**Security & Privacy:**

- Input sanitization with modern validation libraries
- Rate limiting with Redis or in-memory stores
- Content Security Policy (CSP) for XSS prevention
- Privacy-first design with local-only data processing
- Secure headers and HTTPS enforcement
- **Port Management Rule**: NEVER close or modify ports that Sofathek did not open (critical for shared server environments with other productive services)

**Mobile Optimization:**

- Touch-optimized controls with Pointer Events API
- Responsive design with Container Queries
- Offline-first architecture with Service Workers
- Battery-efficient video streaming with adaptive bitrate
- iOS/Android PWA installation support

**Administration Features:**

- Real-time download progress with WebSockets
- System health monitoring with Prometheus metrics
- Structured logging with modern logging libraries
- Configuration backup with automated scheduling
- User activity analytics with privacy compliance

**Modern Development:**

- TypeScript for type safety and developer experience
- ESM modules for better tree-shaking
- Vite or modern bundlers for faster development
- Docker multi-stage builds for smaller images
- GitHub Actions for CI/CD automation

**Server Coexistence & Safety Rules:**

**⚠️ CRITICAL: Shared Server Environment Safety**

Sofathek will be deployed on a server alongside other productive services. Strict adherence to these rules is mandatory:

1. **Port Management (CRITICAL)**:
   - **NEVER close ports that Sofathek did not open**
   - **NEVER modify existing port configurations**
   - Only bind to ports explicitly allocated for Sofathek
   - Use Docker port mapping to avoid conflicts with host services
   - Always verify port availability before binding

2. **Resource Isolation**:
   - Use Docker containers for complete service isolation
   - Limit CPU and memory usage through Docker resource constraints
   - Avoid system-wide package installations that could affect other services
   - Use dedicated Docker volumes, never modify host filesystem directly

3. **Network Safety**:
   - Only listen on explicitly assigned network interfaces
   - Use Docker networks for internal communication
   - Never modify host networking rules or iptables
   - Test network changes in isolated environments first

4. **Process Management**:
   - Run all services within Docker containers
   - Never kill or modify processes not owned by Sofathek
   - Use proper signal handling for graceful shutdowns
   - Monitor resource usage to prevent system overload

5. **Testing & Development Safety**:
   - Always use Docker Compose for testing environments
   - Never test port operations directly on production server
   - Use ephemeral containers for development and testing
   - Validate all network configurations in staging environment

**Violation of these rules may cause service interruptions for other productive applications and is strictly forbidden.**

**Success Criteria - CEO Quality Standards:**

**🚨 EVERY CRITERION MUST BE VALIDATED BY PASSING PLAYWRIGHT TESTS**

**Phase 1 Completion Criteria:**

1. ✅ Template repository successfully adapted with 100% passing infrastructure tests
2. ✅ All API endpoints tested and validated (sunny + rainy day scenarios)
3. ✅ Frontend renders without errors (validated by Playwright smoke tests)
4. ✅ Docker deployment tested and validated in production-like environment
5. ✅ Security tests pass (input validation, HTTPS, authentication)

**Phase 2 Completion Criteria:** 6. ✅ YouTube videos download and process correctly (end-to-end yt-dlp testing) 7. ✅ Video categorization system tested with real video files 8. ✅ ffmpeg integration tested (thumbnail generation, metadata extraction) 9. ✅ File system scanning tested with 100-1000 video collections 10. ✅ Error handling tested (corrupted files, disk full, network failures)

**Phase 3 Completion Criteria:** 11. ✅ Video library displays in responsive CSS Grid (visual regression tested) 12. ✅ All 10 themes pass visual regression tests (pixel-perfect validation) 13. ✅ Dark/light mode tested for each theme (automated screenshot comparison) 14. ✅ Mobile interface tested on real devices (iOS, Android) 15. ✅ Accessibility compliance verified (WCAG 2.1 AA automated + manual testing)

**Phase 4 Completion Criteria:** 16. ✅ Video playback tested with real streaming (performance benchmarked) 17. ✅ Seeking functionality tested (±1 second accuracy verified) 18. ✅ Resume functionality tested across browser sessions 19. ✅ Profile switching tested (user preferences persistence validated) 20. ✅ Cross-browser compatibility tested (Chrome, Firefox, Safari, Edge)

**Phase 5 Completion Criteria:** 21. ✅ Admin interface tested (complete file management operations) 22. ✅ YouTube integration tested with real URLs (quality selection validated) 23. ✅ Download queue management tested (concurrent downloads, error recovery) 24. ✅ System monitoring tested (storage usage, health checks, alerting) 25. ✅ Performance benchmarks met (Core Web Vitals, load testing)

**Continuous Quality Criteria:** 26. ✅ Zero console errors or warnings in any browser 27. ✅ Zero failing Playwright tests in CI/CD pipeline 28. ✅ Security penetration tests pass (no vulnerabilities) 29. ✅ Performance regression tests pass (baseline maintenance) 30. ✅ Visual regression tests pass (design consistency maintained)

**CEO Validation Requirements:** 31. ✅ Complete user journey testing (new user to power user scenarios) 32. ✅ Stress testing with realistic loads (concurrent users, large files) 33. ✅ Disaster recovery testing (data backup, service restoration) 34. ✅ Production deployment validation (monitoring, alerting, rollback) 35. ✅ Quality dashboard shows 100% green status across all metrics

**MANDATORY QUALITY GATES:**

- **NO PHASE PROGRESSES** without 100% test pass rate
- **NO FEATURE SHIPS** without comprehensive test coverage
- **NO WARNINGS TOLERATED** in any environment
- **NO MANUAL TESTING ACCEPTED** - everything must be automated
- **NO EXCUSES** for broken functionality or poor performance

**Final Acceptance Criteria:**

> _"The CEO must be able to use every feature flawlessly, experience zero bugs, see perfect visual design, and have complete confidence in the system's reliability. The Playwright test suite must validate this experience automatically and continuously."_
