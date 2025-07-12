import mongoose, { Document, Schema } from 'mongoose';

export interface ICamera extends Document {
  cameraId: string;
  tableId: string;
  IPAddress: string;
  username: string;
  password: string;
  isConnect: boolean;
}

const CameraSchema = new Schema({
  cameraId: {
    type: String,
    unique: true
  },
  tableId: {
    type: String,
    ref: 'Table',
    required: true
  },
  IPAddress: {
    type: String,
    required: true,
    unique: true
  },
  username: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  isConnect: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

CameraSchema.pre('save', function (next) {
  if (!this.cameraId) {
    this.cameraId = `CAM-${Date.now()}`;
  }
  next();
});

export const Camera = mongoose.model<ICamera>('Camera', CameraSchema); 