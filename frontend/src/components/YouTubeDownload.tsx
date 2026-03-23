import React, { useState, useEffect } from 'react';
import { Card, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { useYouTubeDownload } from '../hooks/useYouTube';
import { validateVideoUrl } from '../services/youtube';
import { getUserFriendlyErrorMessage } from '../lib/error';

interface YouTubeDownloadProps {
  className?: string;
}

export function YouTubeDownload({ className = '' }: YouTubeDownloadProps) {
  const [url, setUrl] = useState('');
  const downloadMutation = useYouTubeDownload();

  // Reset error state when URL changes
  useEffect(() => {
    if (downloadMutation.isError) {
      downloadMutation.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]); // Only depend on URL, not the entire mutation object to avoid infinite loops

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim()) {
      return;
    }

    // Validate YouTube URL using imported utility
    const validation = validateVideoUrl(url.trim());
    if (!validation.isValid) {
      return;
    }

    downloadMutation.mutate({
      url: url.trim()
    });

    // Clear form on successful submission
    if (!downloadMutation.isError) {
      setUrl('');
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
  };

  const validation = validateVideoUrl(url.trim());
  const isValidUrl = url.trim() && validation.isValid;
  const canSubmit = isValidUrl && !downloadMutation.isPending;

  return (
    <Card className={`youtube-download ${className}`} data-testid="youtube-download">
      <CardHeader>
        <CardTitle>Download Video</CardTitle>
        <CardDescription>
          Enter a video URL to download. Supports YouTube and other video platforms.
        </CardDescription>
      </CardHeader>

      <div className="p-6 pt-0">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* URL Input */}
          <div className="space-y-2">
            <label htmlFor="youtube-url" className="text-sm font-medium">
              Video URL
            </label>
            <input
              id="youtube-url"
              type="url"
              value={url}
              onChange={handleUrlChange}
              placeholder="https://www.youtube.com/watch?v=... or https://example.com/video.mp4"
              className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={downloadMutation.isPending}
              data-testid="youtube-url-input"
            />
            {/* URL Validation Message */}
            {url.trim() && !validation.isValid && (
              <p className="text-sm text-red-600" data-testid="url-validation-error">
                Please enter a valid video URL
              </p>
            )}
          </div>

          {/* Error Alert */}
          {downloadMutation.isError && (
            <Alert variant="destructive" data-testid="download-error">
              <AlertDescription>
                {getUserFriendlyErrorMessage(downloadMutation.error)}
              </AlertDescription>
            </Alert>
          )}

          {/* Success Alert */}
          {downloadMutation.isSuccess && (
            <Alert data-testid="download-success">
              <AlertDescription>
                Download started successfully! Check the download queue below for progress.
              </AlertDescription>
            </Alert>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={!canSubmit}
            className="w-full"
            data-testid="download-button"
          >
            {downloadMutation.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Starting Download...
              </>
            ) : (
              'Download Video'
            )}
          </Button>
        </form>

        {/* URL Validation Hint */}
        {url.trim() && !validation.isValid && (
          <div className="mt-2 text-sm text-muted-foreground">
            {validation.error || 'Please enter a valid video URL (HTTP or HTTPS)'}
          </div>
        )}
      </div>
    </Card>
  );
}