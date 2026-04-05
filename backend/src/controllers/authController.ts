import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
// import jwt, { SignOptions } from "jsonwebtoken";

import User from '../models/User';
import { createError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

const signToken = (id: string, role: string, storeId?: string) =>
  jwt.sign({ id, role, storeId }, process.env.JWT_SECRET || 'secret', {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;
    if (!email || !password) throw createError('Email and password required', 400);

    const user = await User.findOne({ email }).select('+password');
    if (!user || !user.isActive) throw createError('Invalid credentials', 401);

    const isMatch = await user.comparePassword(password);
    if (!isMatch) throw createError('Invalid credentials', 401);

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const token = signToken(user.id, user.role, user.storeId?.toString());

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          storeId: user.storeId,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getMe = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await User.findById(req.user?.id);
    if (!user) throw createError('User not found', 404);
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

export const changePassword = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user?.id).select('+password');
    if (!user) throw createError('User not found', 404);

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) throw createError('Current password is incorrect', 400);

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    next(err);
  }
};
