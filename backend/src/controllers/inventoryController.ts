import { Request, Response, NextFunction } from 'express';
import Inventory from '../models/Inventory';
import { createError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { cacheGet, cacheSet, cacheDel } from '../config/redis';

export const getInventory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { storeId, productId, lowStock } = req.query;
    const filter: Record<string, unknown> = {};
    if (storeId) filter.storeId = storeId;
    if (productId) filter.productId = productId;
    if (lowStock === 'true') {
      filter.$expr = { $lte: ['$quantityOnHand', '$reorderPoint'] };
    }

    const inventory = await Inventory.find(filter)
      .populate('productId', 'name category variants images')
      .populate('storeId', 'name code')
      .lean();

    res.json({ success: true, data: inventory });
  } catch (err) {
    next(err);
  }
};

export const getInventoryByStore = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { storeId } = req.params;
    const cacheKey = `inventory:store:${storeId}`;
    const cached = await cacheGet(cacheKey);
    if (cached) { res.json(JSON.parse(cached)); return; }

    const inventory = await Inventory.find({ storeId })
      .populate('productId', 'name category basePrice variants')
      .lean();

    const response = { success: true, data: inventory };
    await cacheSet(cacheKey, JSON.stringify(response), 60);
    res.json(response);
  } catch (err) {
    next(err);
  }
};

export const adjustStock = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { productId, variantSku, storeId, quantity, type, note } = req.body;

    const inventory = await Inventory.findOneAndUpdate(
      { productId, variantSku, storeId },
      {
        $inc: { quantityOnHand: quantity },
        $push: {
          transactions: {
            type,
            quantity,
            note,
            performedBy: req.user?.id,
            timestamp: new Date(),
          },
        },
      },
      { new: true, upsert: true, runValidators: true }
    );

    await cacheDel(`inventory:store:${storeId}`);
    res.json({ success: true, data: inventory });
  } catch (err) {
    next(err);
  }
};

export const transferStock = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { fromStoreId, toStoreId, variantSku, productId, quantity, note } = req.body;
    const userId = req.user!.id;
    const ref = `TRANSFER-${Date.now()}`;

    const source = await Inventory.findOne({ storeId: fromStoreId, variantSku });
    if (!source || source.quantityOnHand < quantity) {
      throw createError('Insufficient stock for transfer', 409);
    }

    await Inventory.findOneAndUpdate(
      { storeId: fromStoreId, variantSku },
      {
        $inc: { quantityOnHand: -quantity },
        $push: {
          transactions: {
            type: 'transfer_out',
            quantity: -quantity,
            reference: ref,
            note,
            performedBy: userId,
            timestamp: new Date(),
          },
        },
      }
    );

    await Inventory.findOneAndUpdate(
      { storeId: toStoreId, variantSku },
      {
        $inc: { quantityOnHand: quantity },
        $setOnInsert: { productId, reorderPoint: 10, reorderQuantity: 50 },
        $push: {
          transactions: {
            type: 'transfer_in',
            quantity,
            reference: ref,
            note,
            performedBy: userId,
            timestamp: new Date(),
          },
        },
      },
      { upsert: true }
    );

    await cacheDel(`inventory:store:${fromStoreId}`, `inventory:store:${toStoreId}`);
    res.json({ success: true, message: 'Transfer completed', reference: ref });
  } catch (err) {
    next(err);
  }
};

export const getLowStockAlerts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const alerts = await Inventory.aggregate([
      { $match: { $expr: { $lte: ['$quantityOnHand', '$reorderPoint'] } } },
      {
        $lookup: {
          from: 'products',
          localField: 'productId',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: '$product' },
      {
        $lookup: {
          from: 'stores',
          localField: 'storeId',
          foreignField: '_id',
          as: 'store',
        },
      },
      { $unwind: '$store' },
      {
        $project: {
          'product.name': 1,
          'product.category': 1,
          variantSku: 1,
          'store.name': 1,
          'store.code': 1,
          quantityOnHand: 1,
          reorderPoint: 1,
          reorderQuantity: 1,
          deficit: { $subtract: ['$reorderPoint', '$quantityOnHand'] },
        },
      },
      { $sort: { deficit: -1 } },
    ]);
    res.json({ success: true, data: alerts });
  } catch (err) {
    next(err);
  }
};