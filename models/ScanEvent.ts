import mongoose, { Schema, Document, models, model, Types } from 'mongoose';

export interface IScanEvent extends Document {
  barcode: string;
  sessionId: string;
  processed: boolean;
  createdAt: Date;
}

const ScanEventSchema = new Schema<IScanEvent>(
  {
    barcode: { type: String, required: true },
    sessionId: { type: String, required: true },
    processed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Auto-delete scan events after 10 minutes (600 seconds)
ScanEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 600 });
ScanEventSchema.index({ processed: 1 });
ScanEventSchema.index({ sessionId: 1, processed: 1 });

const ScanEvent = models.ScanEvent || model<IScanEvent>('ScanEvent', ScanEventSchema);
export default ScanEvent;
