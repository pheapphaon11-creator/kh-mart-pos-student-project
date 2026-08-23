import mongoose, { Schema, Document, models, model, Types } from 'mongoose';

export interface ISettings extends Document {
  storeName: string;
  storeNameKh: string;
  address: string;
  phone: string;
  email?: string;
  taxRate: number;
  exchangeRate: number;
  pointsPerDollar: number;
  currency: 'USD' | 'KHR';
  logo?: string;
  receiptFooter: string;
  branch?: Types.ObjectId;
  updatedAt: Date;
}

const SettingsSchema = new Schema<ISettings>(
  {
    storeName: { type: String, default: 'KH Mart' },
    storeNameKh: { type: String, default: 'ខេ អេស ម៉ាត' },
    address: { type: String, default: 'Phnom Penh, Cambodia' },
    phone: { type: String, default: '+855 23 000 000' },
    email: { type: String },
    taxRate: { type: Number, default: 10 },
    exchangeRate: { type: Number, default: 4100 },
    pointsPerDollar: { type: Number, default: 1 },
    currency: { type: String, enum: ['USD', 'KHR'], default: 'USD' },
    logo: { type: String },
    receiptFooter: { type: String, default: 'Thank you for shopping at KH Mart! / អរគុណសម្រាប់ការទិញទំនិញ!' },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch' },
  },
  { timestamps: true }
);

const Settings = models.Settings || model<ISettings>('Settings', SettingsSchema);
export default Settings;
