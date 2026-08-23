import mongoose, { Schema, Document, models, model, Types } from 'mongoose';

export interface ICategory extends Document {
  name: string;
  nameKh: string;
  description?: string;
  icon: string;
  color: string;
  isActive: boolean;
  branch?: Types.ObjectId;
  createdAt: Date;
}

const CategorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, trim: true },
    nameKh: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    icon: { type: String, default: '📦' },
    color: { type: String, default: '#4f46e5' },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

CategorySchema.index({ branch: 1, name: 1 });

const Category = models.Category || model<ICategory>('Category', CategorySchema);
export default Category;
