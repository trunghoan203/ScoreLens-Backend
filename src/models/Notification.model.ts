import mongoose, { Document, Schema } from 'mongoose';

export interface INotification extends Document {
  supportRequestId: string;
  dateTime: Date;
}

const NotificationSchema = new Schema({
  supportRequestId: {
    type: Schema.Types.ObjectId,
    ref: 'SupportRequest',
    required: true
  },
  dateTime: {
    type: Date,
    required: true,
    default: Date.now
  }
}, {
  timestamps: true
});

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);