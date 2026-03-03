// Test script for error handler functionality
import express, { Request, Response, NextFunction } from 'express';
import { globalErrorHandler, notFoundHandler, AppError, catchAsync } from './middleware/errorHandler';

const app = express();
app.use(express.json());

// Test route that throws an operational error
app.get('/test-error', catchAsync(async (_req: Request, _res: Response, _next: NextFunction) => {
  throw new AppError('This is a test error', 400);
}));

// Test route that throws a non-operational error
app.get('/test-system-error', catchAsync(async (_req: Request, _res: Response, _next: NextFunction) => {
  throw new Error('This is a system error');
}));

// Test route that works fine
app.get('/test-success', (_req: Request, res: Response) => {
  res.json({ status: 'success', message: 'Test endpoint working' });
});

// Add 404 handler
app.use(notFoundHandler);

// Add global error handler
app.use(globalErrorHandler);

async function testErrorHandler() {
  console.log('Testing error handler middleware...');
  
  // Start server
  const server = app.listen(0, () => {
    const port = (server.address() as any)?.port;
    console.log(`Test server running on port ${port}`);
    
    // Test successful request
    fetch(`http://localhost:${port}/test-success`)
      .then(res => res.json())
      .then(data => {
        console.log('✅ Success endpoint:', data);
      })
      .catch(err => console.error('❌ Success test failed:', err));
    
    // Test operational error
    fetch(`http://localhost:${port}/test-error`)
      .then(res => res.json())
      .then(data => {
        console.log('✅ Operational error handled:', data);
      })
      .catch(err => console.error('❌ Error test failed:', err));
    
    // Test 404 error
    fetch(`http://localhost:${port}/nonexistent`)
      .then(res => res.json())
      .then(data => {
        console.log('✅ 404 error handled:', data);
      })
      .catch(err => console.error('❌ 404 test failed:', err));
    
    // Clean up
    setTimeout(() => {
      server.close();
      console.log('✅ Error handler tests completed');
    }, 1000);
  });
}

testErrorHandler();