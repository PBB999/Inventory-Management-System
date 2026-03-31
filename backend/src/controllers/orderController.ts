import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import Order from '../models/Order';
import Customer from '../models/Customer';
import Inventory from '../models/Inventory';
import { createError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

const generateOrderNumber = async (): Promise<string> => {
  const count = await Order.countDocuments();
  const timestamp = Date.now().toString().slice(-6);
  const sequence = String(count + 1).padStart(5, '0');
  return `ORD-${timestamp}-${sequence}`;
};

const tryDecrementStock = async (
  storeId: string,
  variantSku: string,
  quantity: number,
  userId: string
): Promise<void> => {
  if (!storeId) return;
  try {
    await Inventory.findOneAndUpdate(
      { storeId, variantSku, quantityOnHand: { $gte: quantity } },
      {
        $inc: { quantityOnHand: -quantity },
        $push: {
          transactions: {
            type: 'sale',
            quantity: -quantity,
            performedBy: userId,
            timestamp: new Date(),
          },
        },
      }
    );
  } catch {
    console.warn(`[Inventory] Could not decrement stock for SKU: ${variantSku}`);
  }
};

export const createOrder = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const {
      items, storeId, payments, customerPhone, customerName,
      channel = 'pos', notes, isOffline,
    } = req.body;

    const userId = req.user!.id;

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw createError('Order must have at least one item', 400);
    }
    if (!payments || !Array.isArray(payments) || payments.length === 0) {
      throw createError('Order must have at least one payment', 400);
    }

    let subtotal = 0;
    let discountTotal = 0;
    let taxTotal = 0;

    const processedItems = items.map((item: {
      productId: string; variantSku: string; productName: string;
      variantAttributes: Record<string, string>; quantity: number;
      unitPrice: number; discountAmount?: number; taxRate?: number;
    }) => {
      const discount = item.discountAmount || 0;
      const taxable = (item.unitPrice - discount) * item.quantity;
      const tax = taxable * ((item.taxRate || 0) / 100);
      const total = taxable + tax;
      subtotal += item.unitPrice * item.quantity;
      discountTotal += discount * item.quantity;
      taxTotal += tax;
      return {
        productId: item.productId,
        variantSku: item.variantSku,
        productName: item.productName,
        variantAttributes: item.variantAttributes || {},
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountAmount: discount,
        taxRate: item.taxRate || 0,
        taxAmount: tax,
        totalPrice: total,
      };
    });

    const grandTotal = subtotal - discountTotal + taxTotal;
    const amountPaid = payments.reduce(
      (sum: number, p: { amount: number }) => sum + p.amount, 0
    );

    let customerId: mongoose.Types.ObjectId | undefined;
    if (customerPhone) {
      try {
        const customer = await Customer.findOneAndUpdate(
          { phone: customerPhone },
          {
            $setOnInsert: { name: customerName || 'Walk-in', phone: customerPhone },
            $inc: {
              totalPurchases: 1,
              totalSpent: grandTotal,
              loyaltyPoints: Math.floor(grandTotal / 100),
            },
          },
          { upsert: true, new: true }
        );
        customerId = customer._id as mongoose.Types.ObjectId;
      } catch {
        console.warn('[Customer] Upsert failed');
      }
    }

    const orderNumber = await generateOrderNumber();

    const order = await Order.create({
      orderNumber,
      items: processedItems,
      storeId: storeId || undefined,
      cashierId: userId,
      customerId,
      customerName: customerName || undefined,
      customerPhone: customerPhone || undefined,
      channel,
      status: 'confirmed',
      subtotal,
      discountTotal,
      taxTotal,
      grandTotal,
      payments: payments.map((p: { method: string; amount: number; reference?: string }) => ({
        method: p.method,
        amount: p.amount,
        reference: p.reference,
        status: 'completed',
        processedAt: new Date(),
      })),
      amountPaid,
      changeGiven: Math.max(0, amountPaid - grandTotal),
      notes: notes || undefined,
      isOffline: isOffline || false,
      syncedAt: isOffline ? undefined : new Date(),
    });

    if (!isOffline && storeId) {
      for (const item of processedItems) {
        await tryDecrementStock(storeId, item.variantSku, item.quantity, userId);
      }
    }

    res.status(201).json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
};

export const getOrders = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { storeId, status, channel, startDate, endDate, page = 1, limit = 20 } = req.query;
    const filter: Record<string, unknown> = {};

    if (storeId) filter.storeId = storeId;
    else if (req.user?.role === 'cashier' && req.user.storeId) {
      filter.storeId = req.user.storeId;
    }

    if (status) filter.status = status;
    if (channel) filter.channel = channel;
    if (startDate || endDate) {
      filter.createdAt = {
        ...(startDate ? { $gte: new Date(startDate as string) } : {}),
        ...(endDate ? { $lte: new Date(endDate as string) } : {}),
      };
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('cashierId', 'name')
        .populate('storeId', 'name code')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Order.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: orders,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)) || 1,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getOrderById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('cashierId', 'name email')
      .populate('storeId', 'name code address')
      .populate('customerId');
    if (!order) throw createError('Order not found', 404);
    res.json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
};

export const refundOrder = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) throw createError('Order not found', 404);
    if (order.status === 'refunded') throw createError('Order already refunded', 400);

    order.status = 'refunded';
    order.payments.forEach(p => { p.status = 'refunded'; });
    await order.save();

    res.json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
};

export const syncOfflineOrders = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { orders } = req.body as { orders: unknown[] };
    const results = orders.map(orderData => ({ status: 'synced', data: orderData }));
    res.json({ success: true, data: results });
  } catch (err) {
    next(err);
  }
};