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
  return jwt.sign({ adminId: this.adminId }, process.env.ACCESS_TOKEN as string, {
    expiresIn: '15m'
  });
};

adminSchema.methods.signRefreshToken = function (): string {
  return jwt.sign({ adminId: this.adminId }, process.env.REFRESH_TOKEN as string, {
    expiresIn: '7d'
  });
};

export const Admin = mongoose.model<IAdmin>('Admin', adminSchema); 