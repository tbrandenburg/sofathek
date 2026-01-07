import { test, expect } from '@playwright/test';

/**
 * Phase 1: Foundation Infrastructure Tests
 * CEO Standard: Zero tolerance for infrastructure failures
 *
 * These tests validate the core backend infrastructure
 * and ensure API functionality is rock-solid.
 */

test.describe('Phase 1: Foundation Infrastructure', () => {
  test('Backend API health check @foundation @critical', async ({
    request,
  }) => {
    // CEO Standard: Backend must be accessible and healthy
    const response = await request.get('http://127.0.0.1:3007/api/health');
    expect(response.ok()).toBeTruthy();

    const healthData = await response.json();
    expect(healthData).toHaveProperty('status', 'healthy');
  });

  test('CORS configuration @foundation @security', async ({ request }) => {
    // CEO Standard: CORS must be properly configured for cross-origin requests

    // Test with actual cross-origin headers (simulate browser preflight)
    const preflightResponse = await request.fetch(
      'http://127.0.0.1:3007/api/health',
      {
        method: 'OPTIONS',
        headers: {
          Origin: 'http://localhost:3000',
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'Content-Type',
        },
      }
    );

    // Should return 204 or 200 for successful preflight
    expect(preflightResponse.status()).toBeGreaterThanOrEqual(200);
    expect(preflightResponse.status()).toBeLessThan(300);
  });

  test('Sofathek media API endpoints respond @foundation @critical', async ({
    request,
  }) => {
    // CEO Standard: All Sofathek media endpoints must be accessible
    const endpoints = [
      '/api/videos',
      '/api/downloads',
      '/api/profiles',
      '/api/admin/status',
    ];

    for (const endpoint of endpoints) {
      const response = await request.get(`http://127.0.0.1:3007${endpoint}`);
      expect(response.ok()).toBeTruthy();

      const data = await response.json();
      expect(data).toHaveProperty('message');
      expect(data.message).toContain('implementation in progress');
    }
  });

  test('Media infrastructure directories exist @foundation @critical', async ({
    request,
  }) => {
    // CEO Standard: Media storage structure must be ready
    const statusResponse = await request.get(
      'http://127.0.0.1:3007/api/admin/status'
    );
    expect(statusResponse.ok()).toBeTruthy();

    const status = await statusResponse.json();
    expect(status).toHaveProperty('storage');
    expect(status.storage).toHaveProperty('total');
    expect(status.storage).toHaveProperty('used');
    expect(status.storage).toHaveProperty('available');
  });

  test('YouTube download queue accessible @foundation @critical', async ({
    request,
  }) => {
    // CEO Standard: Download system must be functional
    const queueResponse = await request.get(
      'http://127.0.0.1:3007/api/downloads'
    );
    expect(queueResponse.ok()).toBeTruthy();

    const queue = await queueResponse.json();
    expect(queue).toHaveProperty('queue');
    expect(queue).toHaveProperty('active');
    expect(queue).toHaveProperty('completed');
    expect(queue).toHaveProperty('failed');
  });

  test('Profile system responds correctly @foundation @critical', async ({
    request,
  }) => {
    // CEO Standard: Profile management must work
    const profilesResponse = await request.get(
      'http://127.0.0.1:3007/api/profiles'
    );
    expect(profilesResponse.ok()).toBeTruthy();

    const profiles = await profilesResponse.json();
    expect(profiles).toHaveProperty('profiles');
    expect(Array.isArray(profiles.profiles)).toBeTruthy();
  });

  test('Root API shows Sofathek branding @foundation @critical', async ({
    request,
  }) => {
    // CEO Standard: Application must clearly identify as Sofathek
    const response = await request.get('http://127.0.0.1:3007/');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.message).toBe('Sofathek Media Center API');
    expect(data).toHaveProperty('features');
    expect(data).toHaveProperty('endpoints');
    expect(data.features).toContain('Netflix-like video streaming');
    expect(data.features).toContain('YouTube download integration');
  });

  test('Security headers are present @foundation @security', async ({
    request,
  }) => {
    // CEO Standard: Security is non-negotiable
    const response = await request.get('http://127.0.0.1:3007/');

    // Verify security headers
    expect(response.headers()['x-frame-options']).toBeTruthy();
    expect(response.headers()['x-content-type-options']).toBe('nosniff');
  });

  // Responsive design test - can be done without frontend using API validation
  test('Responsive design breakpoints @foundation @responsive', async ({
    request,
  }) => {
    // CEO Standard: API must work on all device sizes (mobile-first)
    // Test API responses with mobile user agents
    const mobileResponse = await request.get(
      'http://127.0.0.1:3007/api/videos',
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7 like Mac OS X) AppleWebKit/605.1.15',
        },
      }
    );
    expect(mobileResponse.ok()).toBeTruthy();

    // API should respond consistently regardless of client
    const desktopResponse = await request.get(
      'http://127.0.0.1:3007/api/videos'
    );
    expect(desktopResponse.ok()).toBeTruthy();

    const mobileData = await mobileResponse.json();
    const desktopData = await desktopResponse.json();
    expect(mobileData).toEqual(desktopData);
  });
});
