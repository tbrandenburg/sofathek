import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';
import { useBackendHealth } from '../hooks/useBackendHealth';

interface ConnectionStatusProps {
  className?: string;
}

export function ConnectionStatus({ className = '' }: ConnectionStatusProps) {
  const { isHealthy, isChecking, lastChecked, retryCount, manualCheck } = useBackendHealth();

  if (isHealthy) {
    return null;
  }

  const formatLastChecked = (date: Date | null): string => {
    if (!date) return 'Never';
    return date.toLocaleTimeString();
  };

  return (
    <Alert variant="destructive" className={`connection-status ${className}`} data-testid="connection-status">
      <AlertDescription className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <span className="font-medium">Backend Unavailable</span>
          <span className="text-sm text-muted-foreground">
            Unable to connect to server. Last checked: {formatLastChecked(lastChecked)}
            {retryCount > 1 && ` (${retryCount} retries)`}
          </span>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={manualCheck}
          disabled={isChecking}
          data-testid="retry-button"
        >
          {isChecking ? 'Checking...' : 'Retry'}
        </Button>
      </AlertDescription>
    </Alert>
  );
}