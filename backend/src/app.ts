import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

// Import routes
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import healthRoutes from './routes/health';

// Sofathek media routes
import videoRoutes from './routes/videos';
import downloadRoutes from './routes/downloads';
import profileRoutes from './routes/profiles';
import adminRoutes from './routes/admin';
import usageRoutes from './routes/usage';
import logsRoutes from './routes/logs';

// Import middleware
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/logger';

const app = express();

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
  })
);

// CORS configuration
const corsOptions = {
  origin:
    process.env.NODE_ENV === 'production'
      ? process.env.FRONTEND_URL || 'http://localhost:3000'
      : ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});

app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Compression middleware
app.use(compression());

// Request logging
app.use(requestLogger);

// API routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// Sofathek media API routes
app.use('/api/videos', videoRoutes);
app.use('/api/downloads', downloadRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/usage', usageRoutes);
app.use('/api/logs', logsRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Sofathek Media Center API',
    version: '1.0.0',
    status: 'healthy',
    features: [
      'Netflix-like video streaming',
      'YouTube download integration',
      'Profile-based theme system',
      'Admin file management',
    ],
    endpoints: {
      videos: '/api/videos',
      downloads: '/api/downloads',
      profiles: '/api/profiles',
      admin: '/api/admin',
      usage: '/api/usage',
    },
    timestamp: new Date().toISOString(),
  });
});

// 404 handler - use a function instead of '*' pattern for Express 5.x
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
    timestamp: new Date().toISOString(),
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

export default app;
