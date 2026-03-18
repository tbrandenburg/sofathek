import { useCallback, useEffect, useState } from 'react';
import { checkBackendHealth, HealthStatus } from '../services/api';

const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds

export interface BackendHealthState {
  isHealthy: boolean;
  isChecking: boolean;
  healthStatus: HealthStatus | null;
  lastChecked: Date | null;
  retryCount: number;
  manualCheck: () => void;
}

export function useBackendHealth(): BackendHealthState {
  const [isHealthy, setIsHealthy] = useState<boolean>(true);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);

  const performHealthCheck = useCallback(async () => {
    setIsChecking(true);
    try {
      const status = await checkBackendHealth();
      setHealthStatus(status);
      setLastChecked(new Date());
      
      if (status !== null && (status.status === 'healthy' || status.status === 'warning')) {
        setIsHealthy(true);
        setRetryCount(0);
      } else {
        setIsHealthy(false);
        setRetryCount(prev => prev + 1);
      }
    } catch {
      setHealthStatus(null);
      setLastChecked(new Date());
      setIsHealthy(false);
      setRetryCount(prev => prev + 1);
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    performHealthCheck();
    
    const interval = setInterval(() => {
      performHealthCheck();
    }, HEALTH_CHECK_INTERVAL);
    
    return () => clearInterval(interval);
  }, [performHealthCheck]);

  return {
    isHealthy,
    isChecking,
    healthStatus,
    lastChecked,
    retryCount,
    manualCheck: performHealthCheck,
  };
}