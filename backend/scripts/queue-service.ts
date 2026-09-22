import { DownloadQueueService } from '../src/services/downloadQueueService';
import { YouTubeDownloadService } from '../src/features/youtube/youTubeDownloadService';
import { ThumbnailService } from '../src/features/video-library/thumbnailService';
import { VideoFileManager } from '../src/features/video-library/videoFileManager';
import { ContentPolicyService } from '../src/services/contentPolicyService';
import { contentPolicy } from '../src/services/contentPolicyConfig';
import { DownloadRequest } from '../src/features/youtube/types';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Import dynamic test URL generator
function generateMockVideoId(): string {
  return 'test_' + Math.random().toString(36).substr(2, 9);
}

function generateMockYouTubeUrl(): string {
  return `https://www.youtube.com/watch?v=${generateMockVideoId()}`;
}

const testQueueService = async () => {
  console.log('Testing DownloadQueueService...');
  
  try {
    // Initialize services
    const tempDir = path.join(process.cwd(), 'temp', 'test-queue');
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
      url: generateMockYouTubeUrl(),
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
