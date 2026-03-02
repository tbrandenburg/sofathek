import React, { useState } from 'react';
import { Card, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { useYouTubeDownload } from '../hooks/useYouTube';

interface YouTubeDownloadProps {
  className?: string;
}

export function YouTubeDownload({ className = '' }: YouTubeDownloadProps) {
  const [url, setUrl] = useState('');
  const downloadMutation = useYouTubeDownload();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim()) {
      return;
    }

    // Basic YouTube URL validation
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
    if (!youtubeRegex.test(url.trim())) {
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

  const isValidUrl = url.trim() && /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/.test(url.trim());
  const canSubmit = isValidUrl && !downloadMutation.isPending;

  return (
    <Card className={`youtube-download ${className}`} data-testid="youtube-download">
      <CardHeader>
        <CardTitle>Download YouTube Video</CardTitle>
        <CardDescription>
          Enter a YouTube URL to download the video to your library (downloads best quality MP4)
        </CardDescription>
      </CardHeader>

      <div className="p-6 pt-0">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* URL Input */}
          <div className="space-y-2">
            <label htmlFor="youtube-url" className="text-sm font-medium">
              YouTube URL
            </label>
            <input
              id="youtube-url"
              type="url"
              value={url}
              onChange={handleUrlChange}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={downloadMutation.isPending}
              data-testid="youtube-url-input"
            />
          </div>

          {/* Error Alert */}
          {downloadMutation.isError && (
            <Alert variant="destructive" data-testid="download-error">
              <AlertDescription>
                {downloadMutation.error instanceof Error 
                  ? downloadMutation.error.message 
                  : 'Failed to start download. Please check the URL and try again.'}
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
        {url.trim() && !isValidUrl && (
          <div className="mt-2 text-sm text-muted-foreground">
            Please enter a valid YouTube URL (youtube.com or youtu.be)
          </div>
        )}
      </div>
    </Card>
  );
}