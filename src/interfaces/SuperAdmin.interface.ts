import { Document } from 'mongoose';

export interface ISuperAdmin extends Document {
  sAdminId: string;
  fullName: string;
  email: string;
  isVerified: boolean;
  activationCode: string | null;
  activationCodeExpires: Date | null;
  lastLogin: Date | null;
  signAccessToken(): string;
  signRefreshToken(): string;
}

export interface SuperAdminRegisterData {
  fullName: string;
  email: string;
}

export interface SuperAdminLoginData {
  email: string;
}

export interface SuperAdminVerifyData {
  email: string;
  activationCode: string;
}