import mongoose, { Schema, Document, models, model, Types } from 'mongoose';

export interface ICustomer extends Document {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  totalSpentUsd: number;
  visitCount: number;
  loyaltyPoints: number;
  isActive: boolean;
  branch?: Types.ObjectId;
  createdAt: Date;
}

const CustomerSchema = new Schema<ICustomer>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true },
    address: { type: String, trim: true },
    totalSpentUsd: { type: Number, default: 0 },
    visitCount: { type: Number, default: 0 },
    loyaltyPoints: { type: Number, default: 0 },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

CustomerSchema.index({ branch: 1, isActive: 1 });
CustomerSchema.index({ phone: 1 });

const Customer = models.Customer || model<ICustomer>('Customer', CustomerSchema);
export default Customer;
