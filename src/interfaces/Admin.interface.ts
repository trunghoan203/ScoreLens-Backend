import { Document } from 'mongoose';

export interface IAdmin extends Document {
  adminId: string;
  fullName: string;
  email: string;
  password?: string;
  isVerified: boolean;
  activationCode?: string | null;
  activationCodeExpires?: Date | null;
  lastLogin?: Date;
  signAccessToken(): string;
  signRefreshToken(): string;
  comparePassword(password: string): Promise<boolean>;
} 