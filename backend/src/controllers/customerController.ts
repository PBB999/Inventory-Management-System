import { Request, Response, NextFunction } from 'express';
import Customer from '../models/Customer';
import Order from '../models/Order';
import { createError } from '../middleware/errorHandler';

export const getCustomers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const filter: Record<string, unknown> = { isActive: true };
    if (search) filter.$text = { $search: search as string };

    const skip = (Number(page) - 1) * Number(limit);
    const [customers, total] = await Promise.all([
      Customer.find(filter).skip(skip).limit(Number(limit)).sort({ totalSpent: -1 }).lean(),
      Customer.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: customers,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) },
    });
  } catch (err) {
    next(err);
  }
};

export const getCustomerById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const customer = await Customer.findById(req.params.id).lean();
    if (!customer) throw createError('Customer not found', 404);

    // Fetch recent orders for this customer
    const recentOrders = await Order.find({ customerId: req.params.id })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('orderNumber grandTotal status createdAt')
      .lean();

    res.json({ success: true, data: { ...customer, recentOrders } });
  } catch (err) {
    next(err);
  }
};

export const getCustomerByPhone = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const customer = await Customer.findOne({ phone: req.params.phone }).lean();
    if (!customer) throw createError('Customer not found', 404);
    res.json({ success: true, data: customer });
  } catch (err) {
    next(err);
  }
};

export const createCustomer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const customer = await Customer.create(req.body);
    res.status(201).json({ success: true, data: customer });
  } catch (err) {
    next(err);
  }
};

export const updateCustomer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!customer) throw createError('Customer not found', 404);
    res.json({ success: true, data: customer });
  } catch (err) {
    next(err);
  }
};

export const getTopCustomers = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const customers = await Customer.find({ isActive: true })
      .sort({ totalSpent: -1 })
      .limit(20)
      .lean();
    res.json({ success: true, data: customers });
  } catch (err) {
    next(err);
  }
};
