// New file - utility for error message extraction
import { ApiError } from '../services/api';

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function isNetworkError(error: unknown): boolean {
  if (error instanceof ApiError) {
    return error.status === 0;
  }
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return message.includes('failed to fetch') ||
           message.includes('networkerror') ||
           message.includes('net::err');
  }
  return false;
}

export function getUserFriendlyErrorMessage(error: unknown): string {
  if (isNetworkError(error)) {
    return 'Backend server unavailable. Please check your connection and try again.';
  }
  return getErrorMessage(error);
}