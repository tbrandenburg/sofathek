import { test, expect } from '@playwright/test';

/**
 * Minimal CI Test - Only server connectivity validation
 * Designed to pass in GitHub Actions CI environment
 */

test.describe('CI Minimal Tests', () => {
  test('server responds to requests', async ({ request }) => {
    // Test backend health endpoint
    const backendResponse = await request.get('http://localhost:3010/health');
    expect(backendResponse.status()).toBe(200);
    
    // Test frontend server
    const frontendResponse = await request.get('http://localhost:5183');
    expect(frontendResponse.status()).toBeGreaterThanOrEqual(200);
    expect(frontendResponse.status()).toBeLessThan(400);
  });
  
  test('frontend serves HTML content', async ({ request }) => {
    const response = await request.get('http://localhost:5183');
    const content = await response.text();
    expect(content).toContain('<html');
    expect(content).toContain('</html>');
  });
  
  test('backend health endpoint returns JSON', async ({ request }) => {
    const response = await request.get('http://localhost:3010/health');
    const healthData = await response.json();
    expect(healthData).toHaveProperty('status');
  });
});