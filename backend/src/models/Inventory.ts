import mongoose, { Document, Schema } from 'mongoose';

export interface IInventoryTransaction {
  type: 'sale' | 'restock' | 'transfer_in' | 'transfer_out' | 'adjustment' | 'return';
  quantity: number;
  reference?: string; // orderId, transferId, etc.
  note?: string;
  performedBy: mongoose.Types.ObjectId;
  timestamp: Date;
}

export interface IInventory extends Document {
  productId: mongoose.Types.ObjectId;
  variantSku: string;
  storeId: mongoose.Types.ObjectId;
  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number; // virtual: onHand - reserved
  reorderPoint: number;
  reorderQuantity: number;
  transactions: IInventoryTransaction[];
  lastCountDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const transactionSchema = new Schema<IInventoryTransaction>({
  type: {
    type: String,
    enum: ['sale', 'restock', 'transfer_in', 'transfer_out', 'adjustment', 'return'],
    required: true,
  },
  quantity: { type: Number, required: true },
  reference: { type: String },
  note: { type: String },
  performedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  timestamp: { type: Date, default: Date.now },
});

const inventorySchema = new Schema<IInventory>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    variantSku: { type: String, required: true, uppercase: true },
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
    quantityOnHand: { type: Number, default: 0, min: 0 },
    quantityReserved: { type: Number, default: 0, min: 0 },
    reorderPoint: { type: Number, default: 10, min: 0 },
    reorderQuantity: { type: Number, default: 50, min: 1 },
    transactions: [transactionSchema],
    lastCountDate: { type: Date },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual: available quantity
inventorySchema.virtual('quantityAvailable').get(function () {
  return Math.max(0, this.quantityOnHand - this.quantityReserved);
});

// Compound unique index: one record per product-variant-store combo
inventorySchema.index({ productId: 1, variantSku: 1, storeId: 1 }, { unique: true });
inventorySchema.index({ storeId: 1, quantityOnHand: 1 });
inventorySchema.index({ variantSku: 1, storeId: 1 });

export default mongoose.model<IInventory>('Inventory', inventorySchema);
