import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticateUser } from '../services/authService';

const router = Router();

// POST /api/auth/login
router.post('/login', asyncHandler(async (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      error: { message: 'Username and password are required' }
    });
  }

  try {
    const result = await authenticateUser(username, password);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: { message: error instanceof Error ? error.message : 'Authentication failed' }
    });
  }
}));

// POST /api/auth/logout
router.post('/logout', asyncHandler(async (req: Request, res: Response) => {
  // In a real app, you would invalidate the JWT token here
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
}));

// GET /api/auth/profile
router.get('/profile', asyncHandler(async (req: Request, res: Response) => {
  // In a real app, you would get this from the authenticated user's JWT token
  res.json({
    success: true,
    data: {
      user: {
        id: '1',
        username: 'demo',
        email: 'demo@example.com',
        role: 'admin',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        profile: {
          firstName: 'Demo',
          lastName: 'User',
          avatar: null,
        }
      }
    }
  });
}));

// POST /api/auth/refresh
router.post('/refresh', asyncHandler(async (req: Request, res: Response) => {
  // Mock token refresh
  res.json({
    success: true,
    data: {
      token: 'mock-jwt-token',
      refreshToken: 'mock-refresh-token',
      expiresIn: 3600
    }
  });
}));

export default router;