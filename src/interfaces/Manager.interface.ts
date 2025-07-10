import { Document, Types } from 'mongoose';

export interface IManager extends Document {
  managerId: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  dateOfBirth: Date;
  citizenCode: string;
  address: string;
  clubId: string;
  activationCode: string | null;
  activationCodeExpires: Date | null;
  isActive: boolean;
  signAccessToken(): string;
  signRefreshToken(): string;
}

// export interface ManagerLoginData {
//   email: string;
// }

// export interface ManagerVerifyData {
//   email: string;
//   activationCode: string;
// }