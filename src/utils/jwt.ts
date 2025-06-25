import { ISuperAdmin } from '../interfaces/SuperAdmin.interface';
import { Response } from 'express';

interface ITokenOptions {
  expires: Date;
  maxAge: number;
  httpOnly: boolean;
  sameSite: 'lax' | 'strict' | 'none' | boolean;
  secure?: boolean;
  path?: string;
}

// Token expiration times (in minutes)
const accessTokenExpire = parseInt(process.env.ACCESS_TOKEN_EXPIRE || '15', 10); // 15 minutes
const refreshTokenExpire = parseInt(process.env.REFRESH_TOKEN_EXPIRE || '7', 10); // 7 days

// Options for cookies
export const accessTokenOptions: ITokenOptions = {
  expires: new Date(Date.now() + accessTokenExpire * 60 * 1000),
  maxAge: accessTokenExpire * 60 * 1000,
  httpOnly: true,
  sameSite: 'none',
  secure: true,
  path: '/'
};

export const refreshTokenOptions: ITokenOptions = {
  expires: new Date(Date.now() + refreshTokenExpire * 24 * 60 * 60 * 1000),
  maxAge: refreshTokenExpire * 24 * 60 * 60 * 1000,
  httpOnly: true,
  sameSite: 'none',
  secure: true,
  path: '/'
};

export const sendAdminToken = (admin: ISuperAdmin, statusCode: number, res: Response): void => {
  const accessToken = admin.signAccessToken();
  const refreshToken = admin.signRefreshToken();

  // Set cookies
  res.cookie('access_token', accessToken, accessTokenOptions);
  res.cookie('refresh_token', refreshToken, refreshTokenOptions);

  res.status(statusCode).json({
    success: true,
    admin: {
      sAdminId: admin.sAdminId,
      fullName: admin.fullName,
      email: admin.email
    },
    accessToken
  });
};