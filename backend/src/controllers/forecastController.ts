import { Request, Response, NextFunction } from 'express';
import Order from '../models/Order';
import Inventory from '../models/Inventory';

interface ForecastResult {
  variantSku: string;
  storeId: string;
  avgDailySales: number;
  currentStock: number;
  daysOfStockRemaining: number;
  suggestedReorderPoint: number;
  suggestedReorderQty: number;
  reorderUrgency: 'critical' | 'soon' | 'ok';
}

/**
 * Computes 30-day sales velocity per SKU/store and suggests reorder parameters.
 */
export const getForecast = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { storeId } = req.query;
    const lookback = 30; // days
    const since = new Date(Date.now() - lookback * 24 * 60 * 60 * 1000);

    const matchStage: Record<string, unknown> = {
      status: { $in: ['confirmed', 'fulfilled'] },
      createdAt: { $gte: since },
    };
    if (storeId) matchStage.storeId = storeId;

    // Aggregate sales velocity per SKU per store
    const velocities = await Order.aggregate([
      { $match: matchStage },
      { $unwind: '$items' },
      {
        $group: {
          _id: { sku: '$items.variantSku', storeId: '$storeId' },
          totalSold: { $sum: '$items.quantity' },
        },
      },
      {
        $project: {
          sku: '$_id.sku',
          storeId: '$_id.storeId',
          avgDailySales: { $divide: ['$totalSold', lookback] },
        },
      },
    ]);

    // Enrich with current inventory levels
    const results: ForecastResult[] = [];
    for (const v of velocities) {
      const inv = await Inventory.findOne({ variantSku: v.sku, storeId: v.storeId }).lean();
      if (!inv) continue;

      const avgDailySales = Math.max(0.01, v.avgDailySales); // avoid division by zero
      const daysOfStockRemaining = inv.quantityOnHand / avgDailySales;

      // Suggested reorder point = 7-day buffer
      const suggestedReorderPoint = Math.ceil(avgDailySales * 7);
      // Suggested reorder qty = 30-day supply
      const suggestedReorderQty = Math.ceil(avgDailySales * 30);

      const reorderUrgency: ForecastResult['reorderUrgency'] =
        daysOfStockRemaining <= 3 ? 'critical' :
        daysOfStockRemaining <= 10 ? 'soon' : 'ok';

      results.push({
        variantSku: v.sku,
        storeId: String(v.storeId),
        avgDailySales: Number(avgDailySales.toFixed(2)),
        currentStock: inv.quantityOnHand,
        daysOfStockRemaining: Number(daysOfStockRemaining.toFixed(1)),
        suggestedReorderPoint,
        suggestedReorderQty,
        reorderUrgency,
      });
    }

    // Sort by urgency
    const urgencyOrder = { critical: 0, soon: 1, ok: 2 };
    results.sort((a, b) => urgencyOrder[a.reorderUrgency] - urgencyOrder[b.reorderUrgency]);

    res.json({ success: true, data: results });
  } catch (err) {
    next(err);
  }
};
