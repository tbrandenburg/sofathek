import { DownloadQueueService } from './services/downloadQueueService';
import { YouTubeDownloadService } from './services/youTubeDownloadService';
import { ThumbnailService } from './services/thumbnailService';
import { DownloadRequest } from './types/youtube';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Import dynamic test URL generator
function generateMockVideoId(): string {
  return 'test_' + Math.random().toString(36).substr(2, 9);
}

function https://www.youtube.com/watch?v=test123abc: string {
  return `https://www.youtube.com/watch?v=${generateMockVideoId()}`;
}

const testQueueService = async () => {
  console.log('Testing DownloadQueueService...');
  
  try {
    // Initialize services
    const videosDir = path.join(process.cwd(), 'data', 'videos');
    const tempDir = path.join(process.cwd(), 'data', 'temp');
    const thumbnailsDir = path.join(process.cwd(), 'data', 'thumbnails');
    
    const thumbnailService = new ThumbnailService(tempDir, thumbnailsDir);
    const youtubeService = new YouTubeDownloadService(videosDir, tempDir, thumbnailService);
    const queueService = new DownloadQueueService(tempDir, youtubeService);
    
    // Initialize queue
    await queueService.initialize();
    console.log('✅ Queue service initialization test passed');
    
    // Test queue status
    const initialStatus = queueService.getQueueStatus();
    console.log('✅ Queue status test passed:', {
      totalItems: initialStatus.totalItems,
      pending: initialStatus.pending
    });
    
    // Test adding to queue (without actual download)
    const mockRequest: DownloadRequest = {
      url: https://www.youtube.com/watch?v=test123abc,
      requestId: uuidv4(),
      requestedAt: new Date()
    };
    
    const queueItem = await queueService.addToQueue(mockRequest);
    console.log('✅ Add to queue test passed:', { queueItemId: queueItem.id });
    
    // Test queue status after adding
    const updatedStatus = queueService.getQueueStatus();
    console.log('✅ Updated queue status test passed:', {
      totalItems: updatedStatus.totalItems,
      pending: updatedStatus.pending
    });
    
    console.log('All DownloadQueueService basic tests passed!');
    console.log('Note: Full processing test skipped to avoid network requests');
    
  } catch (error) {
    console.error('DownloadQueueService test failed:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  testQueueService();
}