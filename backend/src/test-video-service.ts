// Test script for video service functionality
import { VideoService } from './services/videoService';
import path from 'path';

async function testVideoService() {
  const testVideosDir = path.join(process.cwd(), '..', 'data', 'videos');
  const service = new VideoService(testVideosDir);
  
  console.log('Testing video service...');
  
  try {
    const result = await service.scanVideoDirectory();
    console.log('Scan result:', JSON.stringify(result, null, 2));
    
    if (result.videos.length > 0) {
      console.log('✅ Video discovery works!');
      const firstVideo = result.videos[0];
      if (firstVideo) {
        console.log('First video:', firstVideo.metadata.title);
      }
    } else {
      console.log('ℹ️ No videos found (expected if no test videos exist)');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testVideoService();