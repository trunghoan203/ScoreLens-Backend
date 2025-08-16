import mongoose, { Document, Schema } from 'mongoose';

export interface INotification extends Document {
  notificationId: string;
  feedbackId?: string;
  type: 'feedback' | 'admin_register';
  title: string;
  message: string;
  recipientId: string;
  recipientRole: 'superadmin' | 'admin' | 'manager';
  isRead: boolean;
  dateTime: Date;
}

const NotificationSchema = new Schema({
  notificationId: {
    type: String,
    unique: true,
    required: true
  },
  feedbackId: {
    type: String,
    ref: 'Feedback'
  },
  type: {
    type: String,
    enum: ['feedback', 'admin_register'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  recipientId: {
    type: String,
    required: true
  },
  recipientRole: {
    type: String,
    enum: ['superadmin', 'admin', 'manager'],
    required: true
  },
  isRead: {
    type: Boolean,
    default: false
  },
  dateTime: {
    type: Date,
    required: true,
    default: Date.now
  }
}, {
  timestamps: true
});


NotificationSchema.pre('save', function (this: INotification, next) {
  if (!this.notificationId) {
    this.notificationId = `NOTI-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  }
  next();
});

// Index để tối ưu query
NotificationSchema.index({ recipientId: 1, isRead: 1 });
NotificationSchema.index({ recipientRole: 1, isRead: 1 });
NotificationSchema.index({ dateTime: -1 });

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);