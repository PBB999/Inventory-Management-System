import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { createError } from './errorHandler';
import User from '../models/User';

export interface AuthRequest extends Request {
  user?: { id: string; role: string; storeId?: string };
}

export const authenticate = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.split(' ')[1]
      : null;

    if (!token) throw createError('Authentication required', 401);

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as {
      id: string; role: string; storeId?: string;
    };

    const user = await User.findById(decoded.id).select('-password');
    if (!user || !user.isActive) throw createError('User not found or inactive', 401);

    req.user = { id: decoded.id, role: decoded.role, storeId: decoded.storeId };
    next();
  } catch (err) {
    next(err);
  }
};

export const authorize = (...roles: string[]) =>
  (req: AuthRequest, _res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      next(createError('Insufficient permissions', 403));
      return;
    }
    next();
  };
