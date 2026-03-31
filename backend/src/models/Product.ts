import mongoose, { Document, Schema } from 'mongoose';

export interface IVariant {
  sku: string;
  attributes: Record<string, string>; // e.g. { color: 'Red', size: 'M' }
  price: number;
  compareAtPrice?: number;
  barcode?: string;
  weight?: number;
  images: string[];
}

export interface IPricingRule {
  name: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minQuantity?: number;
  startDate?: Date;
  endDate?: Date;
  isActive: boolean;
}

export interface IProduct extends Document {
  name: string;
  description: string;
  category: string;
  subCategory?: string;
  brand?: string;
  basePrice: number;
  taxCategory: 'exempt' | 'standard' | 'reduced';
  taxRate: number;
  variants: IVariant[];
  pricingRules: IPricingRule[];
  images: string[];
  tags: string[];
  isActive: boolean;
  trackInventory: boolean;
  lowStockThreshold: number;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const variantSchema = new Schema<IVariant>({
  sku: { type: String, required: true, unique: true, uppercase: true },
  attributes: { type: Map, of: String, default: {} },
  price: { type: Number, required: true, min: 0 },
  compareAtPrice: { type: Number, min: 0 },
  barcode: { type: String, sparse: true },
  weight: { type: Number, min: 0 },
  images: [{ type: String }],
});

const pricingRuleSchema = new Schema<IPricingRule>({
  name: { type: String, required: true },
  discountType: { type: String, enum: ['percentage', 'fixed'], required: true },
  discountValue: { type: Number, required: true, min: 0 },
  minQuantity: { type: Number, min: 1 },
  startDate: { type: Date },
  endDate: { type: Date },
  isActive: { type: Boolean, default: true },
});

const productSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    category: { type: String, required: true, trim: true },
    subCategory: { type: String, trim: true },
    brand: { type: String, trim: true },
    basePrice: { type: Number, required: true, min: 0 },
    taxCategory: { type: String, enum: ['exempt', 'standard', 'reduced'], default: 'standard' },
    taxRate: { type: Number, default: 18, min: 0, max: 100 },
    variants: [variantSchema],
    pricingRules: [pricingRuleSchema],
    images: [{ type: String }],
    tags: [{ type: String, lowercase: true }],
    isActive: { type: Boolean, default: true },
    trackInventory: { type: Boolean, default: true },
    lowStockThreshold: { type: Number, default: 10, min: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

productSchema.index({ name: 'text', description: 'text', tags: 'text' });
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ 'variants.sku': 1 });
productSchema.index({ 'variants.barcode': 1 });

export default mongoose.model<IProduct>('Product', productSchema);
