import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// Get current user profile
router.get('/me', asyncHandler(async (req: Request, res: Response) => {
  // This would normally get user from JWT token
  // For demo purposes, return a mock user
  const mockUser = {
    id: 1,
    username: 'demo',
    email: 'demo@example.com',
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
    profile: {
      firstName: 'Demo',
      lastName: 'User',
      avatar: null,
    },
  };

  res.json({
    success: true,
    data: { user: mockUser },
  });
}));

// Get all users (admin only)
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  // Mock users data
  const mockUsers = [
    {
      id: 1,
      username: 'demo',
      email: 'demo@example.com',
      createdAt: new Date().toISOString(),
      profile: {
        firstName: 'Demo',
        lastName: 'User',
      },
    },
    {
      id: 2,
      username: 'admin',
      email: 'admin@example.com',
      createdAt: new Date().toISOString(),
      profile: {
        firstName: 'Admin',
        lastName: 'User',
      },
    },
  ];

  res.json({
    success: true,
    data: { users: mockUsers },
    meta: {
      total: mockUsers.length,
      page: 1,
      limit: 10,
    },
  });
}));

// Get user by ID
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  // Mock user lookup
  if (id === '1') {
    const mockUser = {
      id: 1,
      username: 'demo',
      email: 'demo@example.com',
      createdAt: new Date().toISOString(),
      profile: {
        firstName: 'Demo',
        lastName: 'User',
        avatar: null,
      },
    };

    res.json({
      success: true,
      data: { user: mockUser },
    });
  } else {
    res.status(404).json({
      success: false,
      error: { message: 'User not found' },
    });
  }
}));

// Update user profile
router.put('/me', asyncHandler(async (req: Request, res: Response) => {
  const { firstName, lastName, email } = req.body;

  // Mock update
  const updatedUser = {
    id: 1,
    username: 'demo',
    email: email || 'demo@example.com',
    updatedAt: new Date().toISOString(),
    profile: {
      firstName: firstName || 'Demo',
      lastName: lastName || 'User',
      avatar: null,
    },
  };

  res.json({
    success: true,
    data: { user: updatedUser },
    message: 'Profile updated successfully',
  });
}));

export default router;