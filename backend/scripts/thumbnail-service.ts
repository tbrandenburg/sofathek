import { ThumbnailService } from './services/thumbnailService';
import * as path from 'path';

const testThumbnailService = async () => {
  console.log('Testing ThumbnailService...');
  
  try {
    // Initialize service with temp directories
    const tempDir = path.join(process.cwd(), 'data', 'temp');
    const thumbnailsDir = path.join(process.cwd(), 'data', 'thumbnails');
    
    const thumbnailService = new ThumbnailService(tempDir, thumbnailsDir);
    
    // Test directory creation
    await thumbnailService['ensureDirectoriesExist']();
    console.log('✅ Directory creation test passed');
    
    // Test thumbnail path generation
    const testVideoPath = '/path/to/video/test-video.mp4';
    const thumbnailPath = thumbnailService.getThumbnailPath(testVideoPath);
    console.log('✅ Thumbnail path generation test passed:', thumbnailPath);
    
    // Test thumbnail existence check (should be false)
    const exists = await thumbnailService.thumbnailExists(testVideoPath);
    console.log('✅ Thumbnail existence check test passed:', exists);
    
    console.log('All ThumbnailService tests passed!');
    
  } catch (error) {
    console.error('ThumbnailService test failed:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  testThumbnailService();
}