import mongoose, { Schema, Document, models, model } from 'mongoose';

export interface IBranch extends Document {
  name: string;
  address?: string;
  phone?: string;
  isActive: boolean;
  createdAt: Date;
}

const BranchSchema = new Schema<IBranch>(
  {
    name: { type: String, required: true, trim: true, unique: true },
    address: { type: String, trim: true },
    phone: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Branch = models.Branch || model<IBranch>('Branch', BranchSchema);
export default Branch;
