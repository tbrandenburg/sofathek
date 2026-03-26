import { test, expect } from '@playwright/test';

const BACKEND_URL = `http://localhost:${process.env.SOFATHEK_BACKEND_PORT || '3010'}`;
const FRONTEND_URL = `http://localhost:${process.env.SOFATHEK_FRONTEND_PORT || '5183'}`;

/**
 * Minimal CI Test - Only server connectivity validation
 * 
 * This is the ONLY E2E test file used in the CI pipeline.
 * It uses Playwright's request API instead of browser automation
 * for maximum reliability in GitHub Actions CI environment.
 * 
 * Why minimal approach:
 * - Browser automation can be flaky in CI environments
 * - Request API tests are more reliable and faster
 * - Still validates core functionality (server responses, HTML content)
 * - Designed to pass consistently in automated environments
 */

test.describe('CI Minimal Tests', () => {
  test('server responds to requests', async ({ request }) => {
    // Test backend health endpoint
    const backendResponse = await request.get(`${BACKEND_URL}/health`);
    expect(backendResponse.status()).toBe(200);
    
    // Test frontend server
    const frontendResponse = await request.get(FRONTEND_URL);
    expect(frontendResponse.status()).toBeGreaterThanOrEqual(200);
    expect(frontendResponse.status()).toBeLessThan(400);
  });
  
  test('frontend serves HTML content', async ({ request }) => {
    const response = await request.get(FRONTEND_URL);
    const content = await response.text();
    expect(content).toContain('<html');
    expect(content).toContain('</html>');
  });
  
  test('backend health endpoint returns JSON', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/health`);
    const healthData = await response.json();
    expect(healthData).toHaveProperty('status');
  });
});