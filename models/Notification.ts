import mongoose, { Schema, Document, models, model, Types } from 'mongoose';

export interface INotification extends Document {
  title: string;
  message: string;
  type: 'alert' | 'info' | 'success';
  isRead: boolean;
  branch?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, enum: ['alert', 'info', 'success'], default: 'info' },
    isRead: { type: Boolean, default: false },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch' },
  },
  { timestamps: true }
);

const Notification = models.Notification || model<INotification>('Notification', NotificationSchema);
export default Notification;
