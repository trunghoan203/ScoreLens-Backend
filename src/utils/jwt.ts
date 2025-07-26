import { ISuperAdmin } from '../interfaces/SuperAdmin.interface';
import { Response } from 'express';
import { IAdmin } from '../interfaces/Admin.interface';
import { IManager } from '../interfaces/Manager.interface';

interface ITokenOptions {
  expires: Date;
  maxAge: number;
  httpOnly: boolean;
  sameSite: 'lax' | 'strict' | 'none' | boolean;
  secure?: boolean;
  path?: string;
}

// Token expiration times (in minutes)
const accessTokenExpire = parseInt(process.env.ACCESS_TOKEN_EXPIRE || '1', 10); // 15 minutes
const refreshTokenExpire = parseInt(process.env.REFRESH_TOKEN_EXPIRE || '7', 10); // 7 days

// Options for cookies
export const accessTokenOptions: ITokenOptions = {
  expires: new Date(Date.now() + accessTokenExpire * 24 * 60 * 60 * 1000),
  maxAge: accessTokenExpire * 24 * 60 * 60 * 1000,
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

export const sendToken = (user: IAdmin | ISuperAdmin | IManager, statusCode: number, res: Response): void => {
  const accessToken = user.signAccessToken();
  const refreshToken = user.signRefreshToken();

  // Set cookies
  res.cookie('access_token', accessToken, accessTokenOptions);
  res.cookie('refresh_token', refreshToken, refreshTokenOptions);

  let userData;
  if ('adminId' in user) {
    userData = { adminId: user.adminId, fullName: user.fullName, email: user.email };
  } else if ('sAdminId' in user) {
    userData = { sAdminId: user.sAdminId, fullName: user.fullName, email: user.email };
  } else if ('managerId' in user) {
    userData = { managerId: user.managerId, fullName: user.fullName, email: user.email };
  } else {
    userData = { fullName: (user as any).fullName, email: (user as any).email };
  }

  res.status(statusCode).json({
    success: true,
    user: userData,
    accessToken
  });
};