import { describe, test, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useBackendHealth } from '../hooks/useBackendHealth';
import { checkBackendHealth, HealthStatus } from '../services/api';

vi.mock('../services/api', () => ({
  checkBackendHealth: vi.fn(),
}));

const mockCheckBackendHealth = checkBackendHealth as ReturnType<typeof vi.fn>;

describe('useBackendHealth Hook', () => {
  beforeEach(() => {
    mockCheckBackendHealth.mockReset();
  });

  test('should indicate healthy when backend responds', async () => {
    const mockHealth: HealthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'sofathek-backend',
      version: '1.0.0',
      environment: 'test',
      uptime: 100,
    };
    
    mockCheckBackendHealth.mockResolvedValueOnce(mockHealth);

    const { result } = renderHook(() => useBackendHealth());
    
    await waitFor(() => {
      expect(result.current.isHealthy).toBe(true);
    });
    
    expect(result.current.healthStatus).toEqual(mockHealth);
    expect(result.current.isChecking).toBe(false);
  });

  test('should indicate unhealthy when backend is down', async () => {
    mockCheckBackendHealth.mockResolvedValueOnce(null);

    const { result } = renderHook(() => useBackendHealth());
    
    await waitFor(() => {
      expect(result.current.isHealthy).toBe(false);
    });
    
    expect(result.current.healthStatus).toBeNull();
    expect(result.current.retryCount).toBe(1);
  });

  test('should increment retry count on consecutive failures', async () => {
    mockCheckBackendHealth
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    const { result } = renderHook(() => useBackendHealth());
    
    await waitFor(() => {
      expect(result.current.retryCount).toBe(1);
    });
    
    await act(async () => {
      result.current.manualCheck();
    });
    
    await waitFor(() => {
      expect(result.current.retryCount).toBe(2);
    });
  });

  test('should provide manual check function', async () => {
    const mockHealth: HealthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'sofathek-backend',
      version: '1.0.0',
      environment: 'test',
      uptime: 100,
    };
    
    mockCheckBackendHealth
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(mockHealth);

    const { result } = renderHook(() => useBackendHealth());
    
    await waitFor(() => {
      expect(result.current.isHealthy).toBe(false);
    });
    
    await act(async () => {
      result.current.manualCheck();
    });
    
    await waitFor(() => {
      expect(result.current.isHealthy).toBe(true);
    });
  });
});