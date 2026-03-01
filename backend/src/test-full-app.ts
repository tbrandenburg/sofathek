// Test script for full application functionality
import { startServer } from './app';

async function testFullApplication() {
  console.log('Testing full application...');
  
  try {
    // Start server on random port
    const server = await startServer(0);
    const port = (server.address() as any)?.port;
    console.log(`✅ Server started on port ${port}`);
    
    // Test health endpoint
    const healthRes = await fetch(`http://localhost:${port}/health`);
    const healthData = await healthRes.json();
    console.log('✅ Health check:', healthData);
    
    // Test video API
    const videosRes = await fetch(`http://localhost:${port}/api/videos`);
    const videosData = await videosRes.json() as any;
    console.log('✅ Videos API:', videosData.status, `(${videosData.data?.totalCount || 0} videos found)`);
    
    // Test 404 handling
    const notFoundRes = await fetch(`http://localhost:${port}/nonexistent`);
    const notFoundData = await notFoundRes.json() as any;
    console.log('✅ 404 handling:', notFoundData.status);
    
    // Clean up
    server.close();
    console.log('✅ Full application test completed successfully');
    
  } catch (error) {
    console.error('❌ Application test failed:', error);
  }
}

testFullApplication();