import { Request, Response, NextFunction } from 'express';
import Product from '../models/Product';
import { createError } from '../middleware/errorHandler';
import { cacheGet, cacheSet, cacheDel } from '../config/redis';
import { AuthRequest } from '../middleware/auth';

const CACHE_TTL = 300; // 5 minutes

export const getProducts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { category, search, page = 1, limit = 20, isActive = 'true' } = req.query;
    const cacheKey = `products:${JSON.stringify(req.query)}`;

    const cached = await cacheGet(cacheKey);
    if (cached) {
      res.json(JSON.parse(cached));
      return;
    }

    const filter: Record<string, unknown> = { isActive: isActive === 'true' };
    if (category) filter.category = category;
    if (search) filter.$text = { $search: search as string };

    const skip = (Number(page) - 1) * Number(limit);
    const [products, total] = await Promise.all([
      Product.find(filter).skip(skip).limit(Number(limit)).lean(),
      Product.countDocuments(filter),
    ]);

    const response = {
      success: true,
      data: products,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) },
    };

    await cacheSet(cacheKey, JSON.stringify(response), CACHE_TTL);
    res.json(response);
  } catch (err) {
    next(err);
  }
};

export const getProductById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const cacheKey = `product:${req.params.id}`;
    const cached = await cacheGet(cacheKey);
    if (cached) { res.json(JSON.parse(cached)); return; }

    const product = await Product.findById(req.params.id).lean();
    if (!product) throw createError('Product not found', 404);

    const response = { success: true, data: product };
    await cacheSet(cacheKey, JSON.stringify(response), CACHE_TTL);
    res.json(response);
  } catch (err) {
    next(err);
  }
};

export const getProductByBarcode = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { barcode } = req.params;
    const product = await Product.findOne({ 'variants.barcode': barcode }).lean();
    if (!product) throw createError('Product not found for barcode', 404);
    res.json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
};

export const createProduct = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const product = await Product.create({ ...req.body, createdBy: req.user?.id });
    await cacheDel('products:*');
    res.status(201).json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
};

export const updateProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true, runValidators: true,
    });
    if (!product) throw createError('Product not found', 404);
    await cacheDel(`product:${req.params.id}`, 'products:*');
    res.json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
};

export const deleteProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!product) throw createError('Product not found', 404);
    await cacheDel(`product:${req.params.id}`, 'products:*');
    res.json({ success: true, message: 'Product deactivated' });
  } catch (err) {
    next(err);
  }
};
