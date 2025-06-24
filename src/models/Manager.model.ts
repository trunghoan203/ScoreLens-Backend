import mongoose, { Document, Schema } from 'mongoose';

export interface IManager extends Document {
  adminId: string;
  clubId: string;
  fullName: string;
  email: string;
  managerCode: string;
  citizenCode: string;
  phoneNumber: string;
  isActive: boolean;
}

const ManagerSchema = new Schema({
  adminId: {
    type: Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  clubId: {
    type: Schema.Types.ObjectId,
    ref: 'Club',
    required: true
  },
  fullName: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  managerCode: {
    type: String,
    required: true,
    unique: true
  },
  citizenCode: {
    type: String,
    required: true,
    unique: true
  },
  phoneNumber: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

export const Manager = mongoose.model<IManager>('Manager', ManagerSchema); 