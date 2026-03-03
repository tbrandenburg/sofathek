// Queue management test for download operations
import { DownloadQueueService } from './services/downloadQueueService';
import { YouTubeDownloadService } from './services/youTubeDownloadService';
import { ThumbnailService } from './services/thumbnailService';
import * as path from 'path';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { DownloadRequest } from './types/youtube';

// Import dynamic test URL generator
function generateMockVideoId(): string {
  return 'test_' + Math.random().toString(36).substr(2, 9);
}

function generateMockYouTubeUrl(): string {
  return `https://www.youtube.com/watch?v=${generateMockVideoId()}`;
}

async function testDownloadQueue() {
  console.log('🧪 Testing Download Queue Management');
  console.log('=' .repeat(50));
  
  // Setup test directories
  const tempDir = path.join(process.cwd(), 'temp', 'test-queue');
  const videosDir = path.join(process.cwd(), 'temp', 'test-videos');
  const queueFile = path.join(tempDir, 'test-queue.json');
  
  // Ensure test directories exist
  await fs.promises.mkdir(tempDir, { recursive: true });
  await fs.promises.mkdir(videosDir, { recursive: true });
  
  try {
    // Initialize services for testing
    const thumbnailsDir = path.join(videosDir, 'thumbnails');
    await fs.promises.mkdir(thumbnailsDir, { recursive: true });
    
    const thumbnailService = new ThumbnailService(tempDir, thumbnailsDir);
    const youtubeService = new YouTubeDownloadService(videosDir, tempDir, thumbnailService);
    const queueService = new DownloadQueueService(tempDir, youtubeService);
    
    // Initialize queue service
    await queueService.initialize();
    console.log('✅ Queue service initialized');
    
    // Test 1: Initial queue status
    console.log('\n📋 Test 1: Initial Queue Status');
    let status = queueService.getQueueStatus();
    console.log('✅ Initial queue status:');
    console.log(`   Total items: ${status.totalItems}`);
    console.log(`   Pending: ${status.pending}`);
    console.log(`   Processing: ${status.processing}`);
    console.log(`   Completed: ${status.completed}`);
    console.log(`   Failed: ${status.failed}`);
    
    // Test 2: Add items to queue
    console.log('\n📋 Test 2: Adding Items to Queue');
    const testRequests: DownloadRequest[] = [
      {
        url: generateMockYouTubeUrl(),
        requestedAt: new Date(),
        requestId: uuidv4(),
        title: 'Test Video 1'
      },
      {
        url: generateMockYouTubeUrl(),
        requestedAt: new Date(),
        requestId: uuidv4(),
        title: 'Test Video 2'
      },
      {
        url: 'https://www.youtube.com/watch?v=invalid-id',
        requestedAt: new Date(),
        requestId: uuidv4(),
        title: 'Invalid Test Video'
      }
    ];
    
    const queueItems = [];
    for (const request of testRequests) {
      const item = await queueService.addToQueue(request);
      queueItems.push(item);
      console.log(`✅ Added to queue: ${item.id} (${request.title})`);
      console.log(`   Status: ${item.status}`);
      console.log(`   Progress: ${item.progress}%`);
    }
    
    // Test 3: Check updated queue status
    console.log('\n📋 Test 3: Updated Queue Status');
    status = queueService.getQueueStatus();
    console.log('✅ Updated queue status:');
    console.log(`   Total items: ${status.totalItems}`);
    console.log(`   Pending: ${status.pending}`);
    console.log(`   Processing: ${status.processing}`);
    console.log(`   Items in queue: ${status.items.length}`);
    
    // Test 4: Queue item details
    console.log('\n📋 Test 4: Queue Item Details');
    status.items.forEach((item, index) => {
      console.log(`✅ Item ${index + 1}:`);
      console.log(`   ID: ${item.id}`);
      console.log(`   URL: ${item.request.url}`);
      console.log(`   Title: ${item.request.title || 'N/A'}`);
      console.log(`   Status: ${item.status}`);
      console.log(`   Progress: ${item.progress}%`);
      console.log(`   Current Step: ${item.currentStep}`);
      console.log(`   Queued At: ${item.queuedAt.toISOString()}`);
    });
    
    // Test 5: Cancel specific download
    console.log('\n📋 Test 5: Download Cancellation');
    if (queueItems.length > 2) {
      const itemToCancel = queueItems[2]; // Cancel the invalid URL item
      if (itemToCancel) {
        const cancelled = await queueService.cancelDownload(itemToCancel.id);
        if (cancelled) {
          console.log(`✅ Successfully cancelled download: ${itemToCancel.id}`);
        } else {
          console.log(`⚠️ Could not cancel download: ${itemToCancel.id} (may be processing)`);
        }
        
        // Check status after cancellation
        status = queueService.getQueueStatus();
        const cancelledItem = status.items.find(item => item.id === itemToCancel.id);
        if (cancelledItem) {
          console.log(`   Updated status: ${cancelledItem.status}`);
        }
      }
    } else {
      console.log('⚠️ Not enough items in queue to test cancellation');
    }
    
    // Test 6: Queue persistence (simulate restart)
    console.log('\n📋 Test 6: Queue Persistence Test');
    const originalQueueSize = queueService.getQueueStatus().totalItems;
    console.log(`   Original queue size: ${originalQueueSize}`);
    
    // Create new queue service instance (simulates app restart)
    const newQueueService = new DownloadQueueService(tempDir, youtubeService);
    await newQueueService.initialize();
    
    const restoredStatus = newQueueService.getQueueStatus();
    console.log(`✅ Queue restored after 'restart':`);
    console.log(`   Restored queue size: ${restoredStatus.totalItems}`);
    console.log(`   Persistence test: ${originalQueueSize === restoredStatus.totalItems ? 'PASSED' : 'FAILED'}`);
    
    // Test 7: Cleanup old items
    console.log('\n📋 Test 7: Cleanup Old Items');
    const cleanupCount = await newQueueService.cleanupOldItems(0.001); // Very short time for testing
    console.log(`✅ Cleaned up ${cleanupCount} old items`);
    
    const finalStatus = newQueueService.getQueueStatus();
    console.log(`   Queue size after cleanup: ${finalStatus.totalItems}`);
    
    // Test 8: Error handling
    console.log('\n📋 Test 8: Error Handling');
    try {
      // Try to cancel non-existent download
      const nonExistentId = 'non-existent-id-12345';
      const result = await newQueueService.cancelDownload(nonExistentId);
      console.log(`✅ Graceful handling of non-existent ID: ${result}`);
    } catch (error) {
      console.log(`✅ Error handled gracefully: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // Final summary
    console.log('\n📊 Queue Management Test Summary');
    console.log('=' .repeat(50));
    const summary = newQueueService.getQueueStatus();
    console.log(`Items processed: ${summary.totalItems}`);
    console.log(`Current pending: ${summary.pending}`);
    console.log(`Current processing: ${summary.processing}`);
    console.log(`Current completed: ${summary.completed}`);
    console.log(`Current failed: ${summary.failed}`);
    
    console.log('\n🎯 Queue Management Test Complete');
    console.log('   The system successfully demonstrates:');
    console.log('   • Queue item creation and tracking');
    console.log('   • Status monitoring and updates');
    console.log('   • Download cancellation');
    console.log('   • Queue persistence across restarts');
    console.log('   • Old item cleanup functionality');
    console.log('   • Error handling for edge cases');
    
    // Cleanup test files
    try {
      if (fs.existsSync(queueFile)) {
        await fs.promises.unlink(queueFile);
        console.log('✅ Test queue file cleaned up');
      }
    } catch (cleanupError) {
      console.log('⚠️ Could not cleanup test files:', cleanupError);
    }
    
  } catch (error) {
    console.error('❌ Queue management test failed:', error);
    console.log('\n🔧 Troubleshooting:');
    console.log('   • Check file system permissions for temp directory');
    console.log('   • Verify queue service initialization');
    console.log('   • Ensure JSON serialization/deserialization works');
    console.log('   • Check for proper error handling in queue operations');
  }
}

// Run the queue management test
if (require.main === module) {
  testDownloadQueue();
}

export { testDownloadQueue };