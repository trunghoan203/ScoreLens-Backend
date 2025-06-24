import mongoose, { Document, Schema } from 'mongoose';

export interface ISupportRequest extends Document {
  tableId: string;
  reason: string;
}

const SupportRequestSchema = new Schema({
  tableId: {
    type: Schema.Types.ObjectId,
    ref: 'Table',
    required: true
  },
  reason: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

export const SupportRequest = mongoose.model<ISupportRequest>('SupportRequest', SupportRequestSchema); 