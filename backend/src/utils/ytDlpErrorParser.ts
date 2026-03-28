export interface YtDlpErrorInfo {
  code: string;
  message: string;
  suggestion: string;
}

export function parseYtDlpError(stderr: string): YtDlpErrorInfo {
  const lowerStderr = stderr.toLowerCase();

  // Age restriction (check before generic availability to avoid false matches)
  if (lowerStderr.includes('age-restricted') || lowerStderr.includes('age limit')) {
    return {
      code: 'AGE_RESTRICTED',
      message: 'This video is age-restricted and cannot be downloaded.',
      suggestion: 'Try a different video or access it directly on YouTube.',
    };
  }

  // Region block (check before generic availability to avoid false matches)
  if (
    lowerStderr.includes('geographic restriction') ||
    lowerStderr.includes('available in your country') ||
    lowerStderr.includes('not available in your country') ||
    (lowerStderr.includes('this video is not available') && lowerStderr.includes('country'))
  ) {
    return {
      code: 'REGION_BLOCKED',
      message: 'This video is not available in your region.',
      suggestion: 'Try a different video that is available in your country.',
    };
  }

  // Requires login
  if (lowerStderr.includes('login required') || lowerStderr.includes('sign in to confirm')) {
    return {
      code: 'LOGIN_REQUIRED',
      message: 'This video requires you to be signed in to YouTube.',
      suggestion: 'Try a different video or make sure you are signed in.',
    };
  }

  // Rate limited
  if (lowerStderr.includes('http error 429') || lowerStderr.includes('too many requests')) {
    return {
      code: 'RATE_LIMITED',
      message: 'The video service is temporarily rate-limiting requests.',
      suggestion: 'Please wait a moment and try again.',
    };
  }

  // Network error
  if (
    lowerStderr.includes('http error 503') ||
    lowerStderr.includes('http error 502') ||
    lowerStderr.includes('http error 500') ||
    lowerStderr.includes('connection error') ||
    lowerStderr.includes('timed out')
  ) {
    return {
      code: 'NETWORK_ERROR',
      message: 'Could not connect to the video service.',
      suggestion: 'Please check your internet connection and try again.',
    };
  }

  // Video unavailable (generic — must come after more specific checks)
  if (
    lowerStderr.includes('video unavailable') ||
    lowerStderr.includes('is not available') ||
    lowerStderr.includes('http error 404') ||
    lowerStderr.includes('http error')
  ) {
    return {
      code: 'VIDEO_UNAVAILABLE',
      message: 'This video is not available. It may have been deleted or made private.',
      suggestion: 'Please check the video URL and try a different video.',
    };
  }

  // Fallback - return sanitized generic error
  return {
    code: 'DOWNLOAD_FAILED',
    message: 'Could not download this video.',
    suggestion: 'Please check the URL and try again.',
  };
}
