import mongoose, { Schema, Document, models, model, Types } from 'mongoose';

export interface IProduct extends Document {
  name: string;
  nameKh: string;
  sku: string;
  barcode?: string;
  category: Types.ObjectId;
  priceUsd: number;
  costUsd: number;
  stock: number;
  minStock: number;
  unit: string;
  image?: string;
  supplier?: Types.ObjectId;
  branch?: Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true },
    nameKh: { type: String, required: true, trim: true },
    sku: { type: String, required: true, uppercase: true },
    barcode: { type: String, trim: true },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    priceUsd: { type: Number, required: true, min: 0 },
    costUsd: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, default: 0, min: 0 },
    minStock: { type: Number, default: 5, min: 0 },
    unit: { type: String, default: 'pcs' },
    image: { type: String },
    supplier: { type: Schema.Types.ObjectId, ref: 'Supplier' },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

ProductSchema.index({ branch: 1, sku: 1 }, { unique: true });
ProductSchema.index({ branch: 1, isActive: 1 });
ProductSchema.index({ name: 'text', nameKh: 'text', sku: 'text', barcode: 'text' });

const Product = models.Product || model<IProduct>('Product', ProductSchema);
export default Product;
