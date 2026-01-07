import express from 'express';

const app = express();

// Basic setup only
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Sofathek Media Center API - Debug Mode',
    version: '1.0.0',
    status: 'healthy',
  });
});

// Simple test endpoint
app.get('/test', (req, res) => {
  res.json({ message: 'Debug test successful' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
    timestamp: new Date().toISOString(),
  });
});

export default app;
