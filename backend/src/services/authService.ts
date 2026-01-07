import { findUserByUsername } from './userService';

// Simplified auth service for demonstration
export async function authenticateUser(username: string, password: string) {
  const user = findUserByUsername(username);
  
  if (!user) {
    throw new Error('Invalid credentials');
  }

  // Simple password check for demo (in reality, use bcrypt)
  if (password !== 'password') {
    throw new Error('Invalid credentials');
  }

  // Simple token generation for demo (in reality, use JWT)
  const token = `demo-token-${user.id}-${Date.now()}`;

  return {
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
    token,
  };
}

export function verifyToken(token: string) {
  // Simple token verification for demo
  if (token.startsWith('demo-token-')) {
    const parts = token.split('-');
    return { userId: parts[2], valid: true };
  }
  throw new Error('Invalid token');
}