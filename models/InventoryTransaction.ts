import mongoose, { Schema, Document, models, model, Types } from 'mongoose';

export interface IInventoryTransaction extends Document {
  product: Types.ObjectId;
  branch?: Types.ObjectId;
  type: 'in' | 'out' | 'adjustment' | 'sale';
  quantity: number;
  reason: string;
  user: Types.ObjectId;
  prevStock: number;
  newStock: number;
  createdAt: Date;
}

const InventoryTransactionSchema = new Schema<IInventoryTransaction>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch' },
    type: { type: String, required: true, enum: ['in', 'out', 'adjustment', 'sale'] },
    quantity: { type: Number, required: true },
    reason: { type: String, required: true, trim: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    prevStock: { type: Number, required: true },
    newStock: { type: Number, required: true },
  },
  { timestamps: true }
);

InventoryTransactionSchema.index({ product: 1 });
InventoryTransactionSchema.index({ branch: 1 });
InventoryTransactionSchema.index({ createdAt: -1 });

const InventoryTransaction = models.InventoryTransaction || model<IInventoryTransaction>('InventoryTransaction', InventoryTransactionSchema);
export default InventoryTransaction;
