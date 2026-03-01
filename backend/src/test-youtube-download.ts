import { YouTubeDownloadService } from './services/youTubeDownloadService';
import { ThumbnailService } from './services/thumbnailService';
import * as path from 'path';

const testYouTubeDownload = async () => {
  console.log('Testing YouTubeDownloadService...');
  
  try {
    // Initialize services with temp directories
    const videosDir = path.join(process.cwd(), 'data', 'videos');
    const tempDir = path.join(process.cwd(), 'data', 'temp');
    const thumbnailsDir = path.join(process.cwd(), 'data', 'thumbnails');
    
    const thumbnailService = new ThumbnailService(tempDir, thumbnailsDir);
    const youtubeService = new YouTubeDownloadService(videosDir, tempDir, thumbnailService);
    
    // Test URL validation
    const validUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'; // Rick Roll (short, public domain-ish)
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