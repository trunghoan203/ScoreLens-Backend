import { RememberPassword, IRememberPassword } from '../models/RememberPassword.model';
import { Admin } from '../models/Admin.model';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import ErrorHandler from '../utils/ErrorHandler';
import { MESSAGES } from '../config/messages';

export class RememberPasswordService {
  /**
   * Tạo refresh token mới
   */
  static async createRefreshToken(
    adminId: string, 
    isRememberMe: boolean = false
  ): Promise<{ token: string; tokenHash: string; expiresAt: Date }> {
    const admin = await Admin.findOne({ adminId });
    if (!admin) {
      throw new ErrorHandler(MESSAGES.MSG31, 404);
    }

    // Tạo token dựa trên remember me
    const token = isRememberMe ? admin.signRememberMeToken() : admin.signRefreshToken();
    
    // Hash token để lưu vào database
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    
    // Xác định thời gian hết hạn
    const expiresIn = isRememberMe 
      ? process.env.JWT_REMEMBER_ME_EXPIRES_IN || '30d'
      : process.env.JWT_REFRESH_EXPIRES_IN || '7d';
    
    const expiresAt = new Date();
    if (expiresIn.includes('d')) {
      expiresAt.setDate(expiresAt.getDate() + parseInt(expiresIn));
    } else if (expiresIn.includes('h')) {
      expiresAt.setHours(expiresAt.getHours() + parseInt(expiresIn));
    } else if (expiresIn.includes('m')) {
      expiresAt.setMinutes(expiresAt.getMinutes() + parseInt(expiresIn));
    } else {
      expiresAt.setSeconds(expiresAt.getSeconds() + parseInt(expiresIn));
    }

    // Lưu token vào database
    const refreshTokenDoc = await RememberPassword.create({
      id: crypto.randomUUID(),
      adminId,
      tokenHash,
      expiresAt,
      isRememberMe
    });

    return {
      token,
      tokenHash: refreshTokenDoc.tokenHash,
      expiresAt: refreshTokenDoc.expiresAt
    };
  }

  /**
   * Xác thực refresh token
   */
  static async validateRefreshToken(token: string): Promise<{ admin: any; tokenDoc: IRememberPassword }> {
    try {
      // Verify JWT token
      const secret = process.env.REFRESH_TOKEN || 'fallback-refresh-secret';
      const decoded = jwt.verify(token, secret) as { adminId: string };
      
      if (!decoded.adminId) {
        throw new ErrorHandler('Invalid token payload', 401);
      }

      // Hash token để tìm trong database
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      
      // Tìm token trong database
      const tokenDoc = await RememberPassword.findOne({ 
        tokenHash, 
        adminId: decoded.adminId 
      });

      if (!tokenDoc) {
        throw new ErrorHandler('Refresh token not found', 401);
      }

      if (tokenDoc.isRevoked) {
        throw new ErrorHandler('Token has been revoked', 401);
      }

      if (new Date() > tokenDoc.expiresAt) {
        throw new ErrorHandler('Token has expired', 401);
      }

      // Lấy thông tin admin
      const admin = await Admin.findOne({ adminId: decoded.adminId });
      if (!admin || !admin.isVerified) {
        throw new ErrorHandler('Admin không tồn tại or not verified', 401);
      }

      return { admin, tokenDoc };
    } catch (error) {
      if (error instanceof ErrorHandler) {
        throw error;
      }
      throw new ErrorHandler(MESSAGES.MSG11, 401);
    }
  }

  /**
   * Revoke refresh token
   */
  static async revokeRefreshToken(token: string): Promise<void> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    
    const tokenDoc = await RememberPassword.findOne({ tokenHash });
    if (tokenDoc) {
      tokenDoc.isRevoked = true;
      await tokenDoc.save();
    }
  }

  /**
   * Tạo access token mới từ refresh token
   */
  static async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const { admin } = await this.validateRefreshToken(refreshToken);
    
    // Tạo access token mới
    const accessToken = admin.signAccessToken();
    
    // Tạo refresh token mới (rotate refresh token)
    const newRefreshToken = admin.signRefreshToken();
    const newTokenHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
    
    // Revoke token cũ và tạo token mới
    await this.revokeRefreshToken(refreshToken);
    
    const expiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
    const expiresAt = new Date();
    if (expiresIn.includes('d')) {
      expiresAt.setDate(expiresAt.getDate() + parseInt(expiresIn));
    } else if (expiresIn.includes('h')) {
      expiresAt.setHours(expiresAt.getHours() + parseInt(expiresIn));
    } else if (expiresIn.includes('m')) {
      expiresAt.setMinutes(expiresAt.getMinutes() + parseInt(expiresIn));
    } else {
      expiresAt.setSeconds(expiresAt.getSeconds() + parseInt(expiresIn));
    }

    await RememberPassword.create({
      id: crypto.randomUUID(),
      adminId: admin.adminId,
      tokenHash: newTokenHash,
      expiresAt,
      isRememberMe: false
    });

    return { accessToken, refreshToken: newRefreshToken };
  }
} 
