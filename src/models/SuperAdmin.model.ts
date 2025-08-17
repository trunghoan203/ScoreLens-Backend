import { Schema, model } from 'mongoose';
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
    required: [true, 'Tên không được để trống'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email không được để trống'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
      'Vui lòng cung cấp email hợp lệ'
    ]
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

SuperAdminSchema.methods.signAccessToken = function (): string {
  const accessTokenSecret = process.env.ACCESS_TOKEN;
  const accessTokenExpire = process.env.ACCESS_TOKEN_EXPIRE;

  if (!accessTokenSecret || !accessTokenExpire) {
    throw new Error('ACCESS_TOKEN hoặc ACCESS_TOKEN_EXPIRE không được xác định trong các biến môi trường');
  }

  return jwt.sign({ sAdminId: this.sAdminId, role: 'SUPER_ADMIN' }, accessTokenSecret,
    { expiresIn: accessTokenExpire } as jwt.SignOptions);
};

SuperAdminSchema.methods.signRefreshToken = function (): string {
  const refreshTokenSecret = process.env.REFRESH_TOKEN;
  const refreshTokenExpire = process.env.REFRESH_TOKEN_EXPIRE;

  if (!refreshTokenSecret || !refreshTokenExpire) {
    throw new Error('REFRESH_TOKEN hoặc REFRESH_TOKEN_EXPIRE không được xác định trong các biến môi trường');
  }

  return jwt.sign({ sAdminId: this.sAdminId, role: 'SUPER_ADMIN' }, refreshTokenSecret,
    { expiresIn: refreshTokenExpire } as jwt.SignOptions);
};

export const SuperAdmin = model<ISuperAdmin>('SuperAdmin', SuperAdminSchema);