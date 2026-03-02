const express = require('express');
const cors = require('cors');

const app = express();
const port = 3010;

// Enable CORS with specific options for development
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5183', 'http://localhost:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json());

// Mock video data for E2E testing
const mockVideos = [
  {
    id: 'video-1',
    file: {
      name: 'sample-movie.mp4',
      size: 1073741824, // 1GB in bytes
      path: '/videos/sample-movie.mp4',
      extension: 'mp4',
      lastModified: new Date('2024-01-15T10:00:00Z')
    },
    metadata: {
      title: 'Sample Family Movie',
      duration: 7200, // 2 hours in seconds
      width: 1920,
      height: 1080,
      format: 'mp4',
      fps: 24
    },
    viewCount: 5,
    lastViewed: new Date('2024-02-20T19:30:00Z')
  },
  {
    id: 'video-2', 
    file: {
      name: 'nature-documentary.mp4',
      size: 2147483648, // 2GB in bytes
      path: '/videos/nature-documentary.mp4',
      extension: 'mp4',
      lastModified: new Date('2024-01-20T14:30:00Z')
    },
    metadata: {
      title: 'Amazing Nature Documentary',
      duration: 5400, // 1.5 hours in seconds
      width: 1920,
      height: 1080,
      format: 'mp4',
      fps: 30
    },
    viewCount: 12,
    lastViewed: new Date('2024-02-25T15:45:00Z')
  },
  {
    id: 'video-3',
    file: {
      name: 'family-vacation.mp4', 
      size: 536870912, // 512MB in bytes
      path: '/videos/family-vacation.mp4',
      extension: 'mp4',
      lastModified: new Date('2024-02-01T16:15:00Z')
    },
    metadata: {
      title: 'Family Vacation Memories',
      duration: 3600, // 1 hour in seconds
      width: 1280,
      height: 720,
      format: 'mp4',
      fps: 24
    },
    viewCount: 8,
    lastViewed: new Date('2024-02-28T20:15:00Z')
  }
];

// API Routes
app.get('/api/videos', (req, res) => {
  console.log('GET /api/videos called');
  const videoData = {
    videos: mockVideos,
    totalCount: mockVideos.length,
    totalSize: mockVideos.reduce((sum, video) => sum + video.file.size, 0),
    scannedAt: new Date()
  };
  
  // Wrap in ApiResponse format expected by frontend
  const response = {
    status: 'success',
    data: videoData
  };
  
  res.json(response);
});

app.get('/api/videos/:id', (req, res) => {
  console.log(`GET /api/videos/${req.params.id} called`);
  const video = mockVideos.find(v => v.id === req.params.id);
  if (video) {
    // Wrap in ApiResponse format expected by frontend
    const response = {
      status: 'success',
      data: video
    };
    res.json(response);
  } else {
    const response = {
      status: 'error',
      message: 'Video not found'
    };
    res.status(404).json(response);
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(port, () => {
  console.log(`Mock Sofathek API server running at http://localhost:${port}`);
  console.log(`Health check: http://localhost:${port}/health`);
  console.log(`Videos API: http://localhost:${port}/api/videos`);
});