import mongoose, { Document, Schema } from 'mongoose';

export interface ICustomer extends Document {
  name: string;
  email?: string;
  phone: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
  };
  loyaltyPoints: number;
  totalPurchases: number;
  totalSpent: number;
  tags: string[];
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const customerSchema = new Schema<ICustomer>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true, sparse: true },
    phone: { type: String, required: true, unique: true },
    address: {
      street: String,
      city: String,
      state: String,
      postalCode: String,
    },
    loyaltyPoints: { type: Number, default: 0, min: 0 },
    totalPurchases: { type: Number, default: 0, min: 0 },
    totalSpent: { type: Number, default: 0, min: 0 },
    tags: [{ type: String, lowercase: true }],
    notes: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

customerSchema.index({ phone: 1 });
customerSchema.index({ email: 1 });
customerSchema.index({ name: 'text' });

export default mongoose.model<ICustomer>('Customer', customerSchema);
