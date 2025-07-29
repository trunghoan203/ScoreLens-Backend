import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import { IAdmin } from '../interfaces/Admin.interface';
import jwt from 'jsonwebtoken';

const adminSchema = new Schema<IAdmin>({
  adminId: { type: String, required: true, unique: true },
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, select: false },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  isVerified: { type: Boolean, default: false },
  activationCode: { type: String, select: false },
  activationCodeExpires: { type: Date, select: false },
  lastLogin: { type: Date },
  brandId: { type: String, default: null, ref: 'Brand' }
}, { timestamps: true });

adminSchema.pre<IAdmin>('save', async function (next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

adminSchema.methods.comparePassword = async function (enteredPassword: string): Promise<boolean> {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

adminSchema.methods.signAccessToken = function (): string {
  const secret = process.env.JWT_SECRET || process.env.ACCESS_TOKEN || 'fallback-secret';
  return (jwt as any).sign({ adminId: this.adminId }, secret, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '1d'
  });
};

adminSchema.methods.signRefreshToken = function (): string {
  const secret = process.env.JWT_REFRESH_SECRET || process.env.REFRESH_TOKEN || 'fallback-refresh-secret';
  return (jwt as any).sign({ adminId: this.adminId }, secret, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  });
};

adminSchema.methods.signRememberMeToken = function (): string {
  const secret = process.env.JWT_REFRESH_SECRET || process.env.REFRESH_TOKEN || 'fallback-refresh-secret';
  return (jwt as any).sign({ adminId: this.adminId }, secret, {
    expiresIn: process.env.JWT_REMEMBER_ME_EXPIRES_IN || '30d'
  });
};

export const Admin = mongoose.model<IAdmin>('Admin', adminSchema); 