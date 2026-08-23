import { Schema, Document, models, model, Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';

export type UserRole = 'superadmin' | 'admin' | 'manager' | 'cashier';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  isActive: boolean;
  avatar?: string;
  branch?: Types.ObjectId;
  createdAt: Date;
  comparePassword(password: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    role: { type: String, enum: ['superadmin', 'admin', 'manager', 'cashier'], default: 'cashier' },
    isActive: { type: Boolean, default: true },
    avatar: { type: String },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch' },
  },
  { timestamps: true }
);

// Use type assertion to bypass strict overload check in newer Mongoose types
(UserSchema as any).pre('save', async function (this: IUser) {
  if (!this.isModified('password')) return;
  const hash = bcrypt.hash as (data: string, rounds: number) => Promise<string>;
  this.password = await hash(this.password, 12);
});

UserSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
  const compare = bcrypt.compare as (a: string, b: string) => Promise<boolean>;
  return compare(password, this.password);
};

const User = models.User || model<IUser>('User', UserSchema);
export default User;
