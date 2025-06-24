import mongoose, { Document, Schema } from 'mongoose';

export interface ISuperAdmin extends Document {
  fullName: string;
  email: string;
}

const SuperAdminSchema = new Schema({
  fullName: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  }
}, {
  timestamps: true
});

export const SuperAdmin = mongoose.model<ISuperAdmin>('SuperAdmin', SuperAdminSchema); 