import { Document } from 'mongoose';

export interface IAdmin extends Document {
  adminId: string;
  fullName: string;
  email: string;
  password?: string;
  status: string;
  isVerified: boolean;
  activationCode?: string | null;
  activationCodeExpires?: Date | null;
  lastLogin?: Date;
  brandId?: string | null; // brandId của brand mà admin thuộc về, mặc định null
  signAccessToken(): string;
  signRefreshToken(): string;
  comparePassword(password: string): Promise<boolean>;
} 