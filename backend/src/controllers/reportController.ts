import { Request, Response, NextFunction } from 'express';
import Order from '../models/Order';
import Inventory from '../models/Inventory';

export const getSalesSummary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { storeId, startDate, endDate, groupBy = 'day' } = req.query;

    const matchStage: Record<string, unknown> = { status: { $in: ['confirmed', 'fulfilled'] } };
    if (storeId) matchStage.storeId = storeId;
    if (startDate || endDate) {
      matchStage.createdAt = {
        ...(startDate ? { $gte: new Date(startDate as string) } : {}),
        ...(endDate ? { $lte: new Date(endDate as string) } : {}),
      };
    }

    const dateFormat = groupBy === 'month' ? '%Y-%m' : groupBy === 'hour' ? '%Y-%m-%dT%H' : '%Y-%m-%d';

    const summary = await Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: '$createdAt' } },
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$grandTotal' },
          totalDiscount: { $sum: '$discountTotal' },
          totalTax: { $sum: '$taxTotal' },
          avgOrderValue: { $avg: '$grandTotal' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({ success: true, data: summary });
  } catch (err) {
    next(err);
  }
};

export const getTopProducts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { storeId, limit = 10, startDate, endDate } = req.query;
    const matchStage: Record<string, unknown> = { status: { $in: ['confirmed', 'fulfilled'] } };
    if (storeId) matchStage.storeId = storeId;
    if (startDate || endDate) {
      matchStage.createdAt = {
        ...(startDate ? { $gte: new Date(startDate as string) } : {}),
        ...(endDate ? { $lte: new Date(endDate as string) } : {}),
      };
    }

    const topProducts = await Order.aggregate([
      { $match: matchStage },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.variantSku',
          productName: { $first: '$items.productName' },
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.totalPrice' },
        },
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: Number(limit) },
    ]);

    res.json({ success: true, data: topProducts });
  } catch (err) {
    next(err);
  }
};

export const getPaymentMethodBreakdown = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { storeId, startDate, endDate } = req.query;
    const matchStage: Record<string, unknown> = { status: { $in: ['confirmed', 'fulfilled'] } };
    if (storeId) matchStage.storeId = storeId;
    if (startDate || endDate) {
      matchStage.createdAt = {
        ...(startDate ? { $gte: new Date(startDate as string) } : {}),
        ...(endDate ? { $lte: new Date(endDate as string) } : {}),
      };
    }

    const breakdown = await Order.aggregate([
      { $match: matchStage },
      { $unwind: '$payments' },
      { $match: { 'payments.status': 'completed' } },
      {
        $group: {
          _id: '$payments.method',
          totalAmount: { $sum: '$payments.amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { totalAmount: -1 } },
    ]);

    res.json({ success: true, data: breakdown });
  } catch (err) {
    next(err);
  }
};

export const getDashboardKPIs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { storeId } = req.query;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const matchToday: Record<string, unknown> = {
      status: { $in: ['confirmed', 'fulfilled'] },
      createdAt: { $gte: today, $lte: todayEnd },
    };
    const matchYesterday: Record<string, unknown> = {
      status: { $in: ['confirmed', 'fulfilled'] },
      createdAt: { $gte: yesterday, $lt: today },
    };
    if (storeId) {
      matchToday.storeId = storeId;
      matchYesterday.storeId = storeId;
    }

    const [todayStats, yesterdayStats, lowStockCount] = await Promise.all([
      Order.aggregate([
        { $match: matchToday },
        { $group: { _id: null, revenue: { $sum: '$grandTotal' }, orders: { $sum: 1 }, avgOrder: { $avg: '$grandTotal' } } },
      ]),
      Order.aggregate([
        { $match: matchYesterday },
        { $group: { _id: null, revenue: { $sum: '$grandTotal' }, orders: { $sum: 1 } } },
      ]),
      Inventory.countDocuments({ $expr: { $lte: ['$quantityOnHand', '$reorderPoint'] } }),
    ]);

    const t = todayStats[0] || { revenue: 0, orders: 0, avgOrder: 0 };
    const y = yesterdayStats[0] || { revenue: 0, orders: 0 };

    const revenueChange = y.revenue > 0 ? ((t.revenue - y.revenue) / y.revenue) * 100 : 0;
    const ordersChange = y.orders > 0 ? ((t.orders - y.orders) / y.orders) * 100 : 0;

    res.json({
      success: true,
      data: {
        todayRevenue: t.revenue,
        todayOrders: t.orders,
        avgOrderValue: t.avgOrder,
        revenueChange: Number(revenueChange.toFixed(1)),
        ordersChange: Number(ordersChange.toFixed(1)),
        lowStockAlerts: lowStockCount,
      },
    });
  } catch (err) {
    next(err);
  }
};
