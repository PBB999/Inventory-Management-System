import Order from '../models/Order';

export const generateOrderNumber = async (): Promise<string> => {
  const count = await Order.countDocuments();
  const timestamp = Date.now().toString().slice(-6);
  const sequence = String(count + 1).padStart(5, '0');
  return `ORD-${timestamp}-${sequence}`;
};