import { Request, Response, NextFunction } from 'express';
import { db, hashPassword } from './db.js';
import { User } from './types.js';

export interface AuthRequest extends Request {
  user?: User;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  // Allow public endpoints
  const publicPaths = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/demo-login',
    '/api/webhooks/instagram',
    '/api/health',
    '/api/meta/setup',
    '/api/meta/validate-urls',
    '/api/data-deletion',
    '/privacy-policy',
    '/terms'
  ];

  if (publicPaths.some(p => req.path.startsWith(p))) {
    return next();
  }

  // Extract session token from cookie or Authorization header
  let token = req.cookies?.auth_token;
  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.substring(7);
  }

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const session = db.getSession(token);
  if (!session) {
    return res.status(401).json({ error: 'Session expired. Please log in again.' });
  }

  const user = db.getUser(session.userId);
  if (!user) {
    return res.status(401).json({ error: 'User account not found' });
  }

  req.user = user;
  next();
}

export async function loginUser(email: string, pass: string): Promise<{ token: string; user: Omit<User, 'passwordHash'> } | null> {
  const user = db.getUserByEmail(email);
  if (!user) return null;

  const hashed = hashPassword(pass);
  if (user.passwordHash !== hashed) return null;

  const token = await db.createSession(user.id);
  const { passwordHash, ...sanitized } = user;
  return { token, user: sanitized };
}
