import mongoose, { Document, Schema } from 'mongoose';

export interface IStore extends Document {
  name: string;
  code: string;
  type: 'physical' | 'warehouse' | 'online';
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
    coordinates?: { lat: number; lng: number };
  };
  contact: { phone: string; email: string };
  taxRate: number;
  currency: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const storeSchema = new Schema<IStore>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    type: { type: String, enum: ['physical', 'warehouse', 'online'], required: true },
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      country: { type: String, required: true, default: 'IN' },
      postalCode: { type: String, required: true },
      coordinates: {
        lat: { type: Number },
        lng: { type: Number },
      },
    },
    contact: {
      phone: { type: String, required: true },
      email: { type: String, required: true },
    },
    taxRate: { type: Number, default: 18, min: 0, max: 100 }, // GST default
    currency: { type: String, default: 'INR' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

storeSchema.index({ code: 1 });
storeSchema.index({ type: 1, isActive: 1 });

export default mongoose.model<IStore>('Store', storeSchema);
