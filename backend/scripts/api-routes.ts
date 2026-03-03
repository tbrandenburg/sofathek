// Test script for API routes functionality
import express from 'express';
import { apiRouter } from './routes/api';
import { globalErrorHandler, notFoundHandler } from './middleware/errorHandler';

const app = express();
app.use(express.json());

// Mount API routes
app.use('/api', apiRouter);

// Error handling middleware
app.use(notFoundHandler);
app.use(globalErrorHandler);

async function testApiRoutes() {
  console.log('Testing API routes...');
  
  // Start server
  const server = app.listen(0, () => {
    const port = (server.address() as any)?.port;
    console.log(`Test server running on port ${port}`);
    
    // Test video list endpoint
    fetch(`http://localhost:${port}/api/videos`)
      .then(res => res.json())
      .then(data => {
        console.log('✅ /api/videos endpoint:', JSON.stringify(data, null, 2));
      })
      .catch(err => console.error('❌ Video list test failed:', err));
    
    // Test specific video endpoint (should work if test video exists)
    fetch(`http://localhost:${port}/api/videos/test-video`)
      .then(res => res.json())
      .then(data => {
        console.log('✅ /api/videos/:id endpoint:', JSON.stringify(data, null, 2));
      })
      .catch(err => console.error('❌ Video by ID test failed:', err));
    
    // Test non-existent video (should return 404)
    fetch(`http://localhost:${port}/api/videos/nonexistent`)
      .then(res => res.json())
      .then(data => {
        console.log('✅ 404 handling for videos:', JSON.stringify(data, null, 2));
      })
      .catch(err => console.error('❌ 404 test failed:', err));
    
    // Test streaming endpoint with partial range request
    const headers = new Headers();
    headers.set('Range', 'bytes=0-1023');
    
    fetch(`http://localhost:${port}/api/stream/test-video.mp4`, { headers })
      .then(res => {
        console.log('✅ Streaming endpoint response:', {
          status: res.status,
          statusText: res.statusText,
          contentRange: res.headers.get('content-range'),
          contentLength: res.headers.get('content-length'),
          contentType: res.headers.get('content-type'),
          acceptRanges: res.headers.get('accept-ranges')
        });
      })
      .catch(err => console.error('❌ Streaming test failed:', err));
    
    // Clean up
    setTimeout(() => {
      server.close();
      console.log('✅ API route tests completed');
    }, 2000);
  });
}

testApiRoutes();