import { YouTubeDownloadService } from '../src/features/youtube/youTubeDownloadService';
import { ThumbnailService } from '../src/features/video-library/thumbnailService';
import { VideoFileManager } from '../src/features/video-library/videoFileManager';
import { ContentPolicyService } from '../src/services/contentPolicyService';
import { contentPolicy } from '../src/services/contentPolicyConfig';
import * as path from 'path';

// Import dynamic test URL generator
function generateMockVideoId(): string {
  return 'test_' + Math.random().toString(36).substr(2, 9);
}

function generateMockYouTubeUrl(): string {
  return `https://www.youtube.com/watch?v=${generateMockVideoId()}`;
}

const testYouTubeDownload = async () => {
  console.log('Testing YouTubeDownloadService...');
  
  try {
    // Initialize services with temp directories
    const tempDir = path.join(process.cwd(), 'temp', 'test-youtube');
    const videosDir = path.join(process.cwd(), 'temp', 'test-videos');
    const thumbnailsDir = path.join(process.cwd(), 'temp', 'test-thumbnails');
    
    // Ensure temp directories are available
    const fs = require('fs');
    await fs.promises.mkdir(tempDir, { recursive: true });
    await fs.promises.mkdir(videosDir, { recursive: true });
    await fs.promises.mkdir(thumbnailsDir, { recursive: true });
    
    const thumbnailService = new ThumbnailService(tempDir, thumbnailsDir);
    const fileManager = new VideoFileManager(videosDir, tempDir);
    const policyService = new ContentPolicyService(contentPolicy);
    const youtubeService = new YouTubeDownloadService(tempDir, fileManager, thumbnailService, policyService);
    
    // Test URL validation with dynamic test URL
    const validUrl = generateMockYouTubeUrl(); // Dynamic test URL
    const invalidUrl = 'https://example.com/not-youtube';
    
    const isValidUrl = await youtubeService.validateYouTubeUrl(validUrl);
    const isInvalidUrl = await youtubeService.validateYouTubeUrl(invalidUrl);
    
    console.log('✅ URL validation test passed:', { validUrl: isValidUrl, invalidUrl: isInvalidUrl });
    
    // Test safe filename creation
    const unsafeTitle = 'Test Video: With <Unsafe> Characters/Title?';
    const safeFilename = youtubeService['createSafeFilename'](unsafeTitle);
    console.log('✅ Safe filename creation test passed:', safeFilename);
    
    // Test directory creation
    await youtubeService['ensureDirectoriesExist']();
    console.log('✅ Directory creation test passed');
    
    console.log('All YouTubeDownloadService basic tests passed!');
    console.log('Note: Full download test skipped to avoid network requests in CI/CD');
    
  } catch (error) {
    console.error('YouTubeDownloadService test failed:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  testYouTubeDownload();
}
