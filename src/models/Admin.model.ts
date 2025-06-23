import mongoose, { Document, Schema } from 'mongoose';

export interface IAdmin extends Document {
  adminId: string;
  sAdminId: string;
  fullName: string;
  password: string;
}

const AdminSchema = new Schema({
  adminId: {
    type: String,
    required: true,
    unique: true
  },
  sAdminId: {
    type: Schema.Types.ObjectId,
    ref: 'SuperAdmin',
    required: true
  },
  fullName: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

export const Admin = mongoose.model<IAdmin>('Admin', AdminSchema); 