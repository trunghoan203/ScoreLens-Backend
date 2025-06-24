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
    required: true,
    unique: true
  },
  tableId: {
    type: Schema.Types.ObjectId,
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

export const Camera = mongoose.model<ICamera>('Camera', CameraSchema); 