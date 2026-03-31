import { Router } from 'express';
import Store from '../models/Store';
import { authenticate, authorize } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';

const router = Router();
router.use(authenticate);

router.get('/', async (_req, res, next) => {
  try {
    const stores = await Store.find({ isActive: true }).lean();
    res.json({ success: true, data: stores });
  } catch (err) { next(err); }
});

router.post('/', authorize('admin'), async (req, res, next) => {
  try {
    const store = await Store.create(req.body);
    res.status(201).json({ success: true, data: store });
  } catch (err) { next(err); }
});

router.put('/:id', authorize('admin'), async (req, res, next) => {
  try {
    const store = await Store.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!store) throw createError('Store not found', 404);
    res.json({ success: true, data: store });
  } catch (err) { next(err); }
});

export default router;
