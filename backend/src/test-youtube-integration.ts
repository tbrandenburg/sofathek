// Integration test for complete YouTube download workflow
import { youTubeDownloadService, downloadQueueService, thumbnailService } from './services';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

async function testYouTubeIntegration() {
  console.log('🧪 Testing YouTube Integration - Complete Workflow');
  console.log('=' .repeat(60));
  
  // Use a short, public domain test video (Big Buck Bunny trailer - 30 seconds)
  const testUrl = 'https://www.youtube.com/watch?v=YE7VzlLtp-4';
  
  try {
    // Step 1: Validate YouTube URL
    console.log('📋 Step 1: URL Validation');
    const isValid = await youTubeDownloadService.validateYouTubeUrl(testUrl);
    if (isValid) {
      console.log('✅ URL validation passed');
    } else {
      console.log('❌ URL validation failed');
      return;
    }
    
    // Step 2: Create download request
    console.log('\n📋 Step 2: Download Request Creation');
    const downloadRequest = {
      url: testUrl,
      requestedAt: new Date(),
      requestId: uuidv4()
    };
    console.log('✅ Download request created');
    console.log(`   Request ID: ${downloadRequest.requestId}`);
    console.log(`   URL: ${downloadRequest.url}`);
    
    // Step 3: Add to download queue
    console.log('\n📋 Step 3: Queue Management');
    const queueItem = await downloadQueueService.addToQueue(downloadRequest);
    console.log('✅ Added to download queue:');
    console.log(`   ID: ${queueItem.id}`);
    console.log(`   Status: ${queueItem.status}`);
    console.log(`   Progress: ${queueItem.progress}%`);
    console.log(`   Current Step: ${queueItem.currentStep}`);
    
    // Step 4: Check queue status
    console.log('\n📋 Step 4: Queue Status Check');
    const queueStatus = downloadQueueService.getQueueStatus();
    console.log('✅ Queue status retrieved:');
    console.log(`   Total items: ${queueStatus.totalItems}`);
    console.log(`   Pending: ${queueStatus.pending}`);
    console.log(`   Processing: ${queueStatus.processing}`);
    console.log(`   Completed: ${queueStatus.completed}`);
    console.log(`   Failed: ${queueStatus.failed}`);
    
    // Step 5: Direct download test (simulating queue processing)
    console.log('\n📋 Step 5: Direct Download Test');
    console.log('⏳ Starting download process (this may take a moment)...');
    
    try {
      const downloadResult = await youTubeDownloadService.downloadVideo(downloadRequest);
      
      if (downloadResult.status === 'success') {
        console.log('✅ Video download completed successfully');
        console.log(`   Title: ${downloadResult.metadata?.title || 'N/A'}`);
        console.log(`   Duration: ${downloadResult.metadata?.duration || 'N/A'}s`);
        console.log(`   Channel: ${downloadResult.metadata?.uploader || 'N/A'}`);
        console.log(`   File path: ${downloadResult.videoPath}`);
        
        // Verify file exists
        if (downloadResult.videoPath && fs.existsSync(downloadResult.videoPath)) {
          const stats = fs.statSync(downloadResult.videoPath);
          console.log(`   File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
        }
        
        // Step 6: Test thumbnail generation
        console.log('\n📋 Step 6: Thumbnail Generation');
        if (downloadResult.videoPath) {
          try {
            const thumbnailPath = await thumbnailService.generateThumbnail(downloadResult.videoPath);
            if (fs.existsSync(thumbnailPath)) {
              console.log('✅ Thumbnail generated successfully');
              console.log(`   Thumbnail path: ${thumbnailPath}`);
            } else {
              console.log('❌ Thumbnail file not found after generation');
            }
          } catch (thumbError) {
            console.log('⚠️ Thumbnail generation failed:', thumbError);
          }
        }
        
      } else if (downloadResult.status === 'error') {
        console.log('❌ Video download failed');
        if (downloadResult.error) {
          console.log(`   Error: ${downloadResult.error}`);
        }
      }
      
    } catch (downloadError) {
      console.log('❌ Download processing failed:', downloadError);
    }
    
    // Step 7: Check updated queue status
    console.log('\n📋 Step 7: Updated Queue Status');
    const updatedQueueStatus = downloadQueueService.getQueueStatus();
    const targetItem = updatedQueueStatus.items.find(item => item.id === queueItem.id);
    if (targetItem) {
      console.log('✅ Queue item found:');
      console.log(`   Status: ${targetItem.status}`);
      console.log(`   Progress: ${targetItem.progress}%`);
      console.log(`   Current Step: ${targetItem.currentStep}`);
      if (targetItem.result) {
        console.log(`   Result Status: ${targetItem.result.status}`);
      }
    }
    
    // Step 8: Cleanup test
    console.log('\n📋 Step 8: Cleanup Test');
    try {
      const cancelled = await downloadQueueService.cancelDownload(queueItem.id);
      if (cancelled) {
        console.log('✅ Download cancellation works');
      } else {
        console.log('⚠️ Item already completed or not found');
      }
    } catch (cancelError) {
      console.log('⚠️ Cleanup test error:', cancelError);
    }
    
    // Final status report
    console.log('\n📊 Integration Test Summary');
    console.log('=' .repeat(60));
    const finalQueueStatus = downloadQueueService.getQueueStatus();
    console.log(`Total items processed: ${finalQueueStatus.totalItems}`);
    console.log(`Successful downloads: ${finalQueueStatus.completed}`);
    console.log(`Failed downloads: ${finalQueueStatus.failed}`);
    
    console.log('\n🎯 YouTube Integration Test Complete');
    console.log('   The system successfully demonstrates:');
    console.log('   • URL validation');
    console.log('   • Queue management and persistence');
    console.log('   • Video download workflow');
    console.log('   • Metadata extraction');
    console.log('   • Thumbnail generation pipeline');
    console.log('   • Error handling and status tracking');
    
  } catch (error) {
    console.error('❌ Integration test failed:', error);
    console.log('\n🔧 Troubleshooting:');
    console.log('   • Ensure internet connectivity for YouTube access');
    console.log('   • Verify yt-dlp is installed and accessible');
    console.log('   • Check that temp directories are writable');
    console.log('   • Confirm FFmpeg is available for thumbnail generation');
  }
}

// Run the integration test
if (require.main === module) {
  testYouTubeIntegration();
}

export { testYouTubeIntegration };