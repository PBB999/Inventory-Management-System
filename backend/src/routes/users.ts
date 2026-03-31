import { Router } from 'express';
import User from '../models/User';
import { authenticate, authorize } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';

const router = Router();

// ── PUBLIC — no auth required ──────────────────────────────────────────────
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    console.log('[Register] body received:', { name, email, role, hasPassword: !!password });

    if (!name || !email || !password) {
      throw createError('Name, email and password are required', 400);
    }
    if (password.length < 8) {
      throw createError('Password must be at least 8 characters', 400);
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      throw createError('Email already registered', 409);
    }

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: role || 'cashier',
      isActive: true,
    });

    res.status(201).json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── All routes below require admin auth ───────────────────────────────────
router.get('/', authenticate, authorize('admin'), async (_req, res, next) => {
  try {
    const users = await User.find().lean();
    res.json({ success: true, data: users });
  } catch (err) { next(err); }
});

router.post('/', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const user = await User.create(req.body);
    res.status(201).json({ success: true, data: user });
  } catch (err) { next(err); }
});

router.put('/:id', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id, req.body, { new: true, runValidators: true }
    );
    if (!user) throw createError('User not found', 404);
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
});

router.delete('/:id', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: 'User deactivated' });
  } catch (err) { next(err); }
});

export default router;