import { Document } from 'mongoose';

export interface IAdmin extends Document {
  adminId: string;
  fullName: string;
  email: string;
  password?: string;
  status: string;
  rejectedReason?: string | null;
  isVerified: boolean;
  activationCode?: string | null;
  activationCodeExpires?: Date | null;
  lastLogin?: Date;
  brandId?: string | null;
  signAccessToken(): string;
  signRefreshToken(): string;
  signRememberMeToken(): string;
  comparePassword(password: string): Promise<boolean>;
} 