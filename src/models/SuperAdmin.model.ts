import { Schema, model} from 'mongoose';
import jwt from 'jsonwebtoken';
import { ISuperAdmin } from '../interfaces/SuperAdmin.interface';

const SuperAdminSchema = new Schema<ISuperAdmin>({
  sAdminId: {
    type: String,
    required: true,
    unique: true
  },
  fullName: { 
    type: String, 
    required: true 
  },
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    lowercase: true, 
    trim: true 
  },
  isVerified: { 
    type: Boolean, 
    default: false 
  },
  activationCode: { 
    type: String, 
    default: null 
  },
  activationCodeExpires: { 
    type: Date, 
    default: null 
  },
  lastLogin: { 
    type: Date, 
    default: null 
  }
}, { 
  timestamps: true 
});

SuperAdminSchema.methods.signAccessToken = function(): string {
  const accessTokenSecret = process.env.ACCESS_TOKEN;
  const accessTokenExpire = process.env.ACCESS_TOKEN_EXPIRE;

  if (!accessTokenSecret || !accessTokenExpire) {
    // Ghi log lỗi để dễ debug
    console.error('JWT Access Token secrets or expiration are not defined in .env');
    // Ném ra một lỗi rõ ràng
    throw new Error('Server configuration error: JWT secrets are missing.');
  }

  return jwt.sign({ sAdminId: this.sAdminId, role: 'SUPER_ADMIN' }, accessTokenSecret, 
    { expiresIn: accessTokenExpire } as jwt.SignOptions);
};

SuperAdminSchema.methods.signRefreshToken = function(): string {
  const refreshTokenSecret = process.env.REFRESH_TOKEN;
  const refreshTokenExpire = process.env.REFRESH_TOKEN_EXPIRE;

  if (!refreshTokenSecret || !refreshTokenExpire) {
    console.error('JWT Refresh Token secrets or expiration are not defined in .env');
    throw new Error('Server configuration error: JWT secrets are missing.');
  }

  return jwt.sign({ sAdminId: this.sAdminId, role: 'SUPER_ADMIN' }, refreshTokenSecret, 
    { expiresIn: refreshTokenExpire } as jwt.SignOptions);
};

export const SuperAdmin = model<ISuperAdmin>('SuperAdmin', SuperAdminSchema);