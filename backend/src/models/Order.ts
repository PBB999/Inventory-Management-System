import mongoose, { Document, Schema } from 'mongoose';

export interface IOrderItem {
  productId: mongoose.Types.ObjectId;
  variantSku: string;
  productName: string;
  variantAttributes: Record<string, string>;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  totalPrice: number;
}

export interface IPayment {
  method: 'cash' | 'credit_card' | 'debit_card' | 'upi' | 'wallet' | 'store_credit';
  amount: number;
  reference?: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  processedAt?: Date;
}

export interface IOrder extends Document {
  orderNumber: string;
  channel: 'pos' | 'online' | 'phone';
  status: 'pending' | 'confirmed' | 'processing' | 'fulfilled' | 'cancelled' | 'refunded';
  storeId: mongoose.Types.ObjectId;
  fulfillmentStoreId?: mongoose.Types.ObjectId;
  cashierId?: mongoose.Types.ObjectId;
  customerId?: mongoose.Types.ObjectId;
  customerName?: string;
  customerPhone?: string;
  items: IOrderItem[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
  payments: IPayment[];
  amountPaid: number;
  changeGiven: number;
  notes?: string;
  isOffline: boolean;
  syncedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const orderItemSchema = new Schema<IOrderItem>({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  variantSku: { type: String, required: true },
  productName: { type: String, required: true },
  variantAttributes: { type: Map, of: String, default: {} },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  discountAmount: { type: Number, default: 0, min: 0 },
  taxRate: { type: Number, default: 0, min: 0 },
  taxAmount: { type: Number, default: 0, min: 0 },
  totalPrice: { type: Number, required: true, min: 0 },
});

const paymentSchema = new Schema<IPayment>({
  method: {
    type: String,
    enum: ['cash', 'credit_card', 'debit_card', 'upi', 'wallet', 'store_credit'],
    required: true,
  },
  amount: { type: Number, required: true, min: 0 },
  reference: { type: String },
  status: { type: String, enum: ['pending', 'completed', 'failed', 'refunded'], default: 'pending' },
  processedAt: { type: Date },
});

const orderSchema = new Schema<IOrder>(
  {
    orderNumber: { type: String, unique: true },
    channel: { type: String, enum: ['pos', 'online', 'phone'], default: 'pos' },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'processing', 'fulfilled', 'cancelled', 'refunded'],
      default: 'pending',
    },
    storeId: { type: Schema.Types.ObjectId, ref: 'Store' },
    fulfillmentStoreId: { type: Schema.Types.ObjectId, ref: 'Store' },
    cashierId: { type: Schema.Types.ObjectId, ref: 'User' },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer' },
    customerName: { type: String },
    customerPhone: { type: String },
    items: { type: [orderItemSchema], required: true, validate: [(v: IOrderItem[]) => v.length > 0, 'Order must have items'] },
    subtotal: { type: Number, required: true, min: 0 },
    discountTotal: { type: Number, default: 0, min: 0 },
    taxTotal: { type: Number, default: 0, min: 0 },
    grandTotal: { type: Number, required: true, min: 0 },
    payments: [paymentSchema],
    amountPaid: { type: Number, default: 0, min: 0 },
    changeGiven: { type: Number, default: 0, min: 0 },
    notes: { type: String },
    isOffline: { type: Boolean, default: false },
    syncedAt: { type: Date },
  },
  { timestamps: true }
);

// Auto-generate order number
orderSchema.pre('save', async function (next) {
  if (this.isNew && !this.orderNumber) {
    const count = await mongoose.model('Order').countDocuments();
    this.orderNumber = `ORD-${Date.now()}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

orderSchema.index({ orderNumber: 1 });
orderSchema.index({ storeId: 1, createdAt: -1 });
orderSchema.index({ cashierId: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ isOffline: 1, syncedAt: 1 });

export default mongoose.model<IOrder>('Order', orderSchema);
