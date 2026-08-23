import mongoose, { Schema, Document, models, model, Types } from 'mongoose';

export interface ISupplier extends Document {
  name: string;
  contactPerson: string;
  phone: string;
  email?: string;
  address?: string;
  company?: string;
  notes?: string;
  isActive: boolean;
  branch?: Types.ObjectId;
  createdAt: Date;
}

const SupplierSchema = new Schema<ISupplier>(
  {
    name: { type: String, required: true, trim: true },
    contactPerson: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true },
    address: { type: String, trim: true },
    company: { type: String, trim: true },
    notes: { type: String, trim: true },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Supplier = models.Supplier || model<ISupplier>('Supplier', SupplierSchema);
export default Supplier;
