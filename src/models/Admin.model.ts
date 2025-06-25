import mongoose, { Document, Schema } from 'mongoose';

export interface IAdmin extends Document {
  sAdminId: string;
  fullName: string;
  email: string;
  password: string;
}

const AdminSchema = new Schema({
  sAdminId: {
    type: Schema.Types.ObjectId,
    ref: 'SuperAdmin',
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
  password: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

export const Admin = mongoose.model<IAdmin>('Admin', AdminSchema); 