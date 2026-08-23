import mongoose, { Schema, Document, models, model, Types } from 'mongoose';

export interface ISaleItem {
  product: Types.ObjectId;
  name: string;
  nameKh: string;
  sku: string;
  qty: number;
  priceUsd: number;
  subtotalUsd: number;
}

export interface ISale extends Document {
  invoiceNo: string;
  items: ISaleItem[];
  subtotalUsd: number;
  discountPercent: number;
  discountUsd: number;
  taxPercent: number;
  taxUsd: number;
  totalUsd: number;
  totalKhr: number;
  exchangeRate: number;
  paymentMethod: 'cash' | 'card' | 'aba' | 'wing' | 'acleda';
  amountPaidUsd: number;
  changeUsd: number;
  customer?: Types.ObjectId;
  cashier: Types.ObjectId;
  branch?: Types.ObjectId;
  note?: string;
  status: 'completed' | 'refunded' | 'void';
  createdAt: Date;
}

const SaleItemSchema = new Schema<ISaleItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    nameKh: { type: String, required: true },
    sku: { type: String, required: true },
    qty: { type: Number, required: true, min: 1 },
    priceUsd: { type: Number, required: true, min: 0 },
    subtotalUsd: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const SaleSchema = new Schema<ISale>(
  {
    invoiceNo: { type: String, required: true, unique: true },
    items: { type: [SaleItemSchema], required: true },
    subtotalUsd: { type: Number, required: true },
    discountPercent: { type: Number, default: 0 },
    discountUsd: { type: Number, default: 0 },
    taxPercent: { type: Number, default: 0 },
    taxUsd: { type: Number, default: 0 },
    totalUsd: { type: Number, required: true },
    totalKhr: { type: Number, required: true },
    exchangeRate: { type: Number, required: true },
    paymentMethod: {
      type: String,
      enum: ['cash', 'card', 'aba', 'wing', 'acleda'],
      default: 'cash',
    },
    amountPaidUsd: { type: Number, required: true },
    changeUsd: { type: Number, required: true },
    customer: { type: Schema.Types.ObjectId, ref: 'Customer' },
    cashier: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch' },
    note: { type: String, trim: true },
    status: { type: String, enum: ['completed', 'refunded', 'void'], default: 'completed' },
  },
  { timestamps: true }
);

SaleSchema.index({ createdAt: -1 });
SaleSchema.index({ branch: 1, status: 1, createdAt: -1 });
SaleSchema.index({ invoiceNo: 1 });

const Sale = models.Sale || model<ISale>('Sale', SaleSchema);
export default Sale;
