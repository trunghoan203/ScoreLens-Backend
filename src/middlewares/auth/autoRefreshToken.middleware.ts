import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { RememberPasswordService } from '../../services/RememberPassword.service';

export const autoRefreshToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    let token = req.cookies?.access_token;
    if (!token) {
      token = req.header('Authorization')?.replace('Bearer ', '');
    }
    if (!token) {
      res.status(401).json({ success: false, message: 'Không có token được cung cấp, vui lòng đăng nhập.' });
      return;
    }

    try {
      // Thử verify access token
      const secret = process.env.ACCESS_TOKEN;
      if (!secret) {
        throw new Error('ACCESS_TOKEN không được xác định trong các biến môi trường');
      }
      const decoded = jwt.verify(token, secret) as { adminId?: string; sAdminId?: string; managerId?: string; iat: number, exp: number };
      
      // Token hợp lệ, tiếp tục
      if (decoded.adminId) {
        (req as any).admin = { adminId: decoded.adminId };
      } else if (decoded.sAdminId) {
        (req as any).superAdmin = { sAdminId: decoded.sAdminId };
      } else if (decoded.managerId) {
        (req as any).manager = { managerId: decoded.managerId };
      }
      
      next();
    } catch (error: any) {
      // Token hết hạn, thử refresh
      if (error.name === 'TokenExpiredError') {
        const refreshToken = req.headers['x-refresh-token'] as string;
        
        if (refreshToken) {
          try {
            const { accessToken, refreshToken: newRefreshToken } = await RememberPasswordService.refreshAccessToken(refreshToken);
            
            // Set headers với tokens mới
            res.setHeader('x-new-access-token', accessToken);
            res.setHeader('x-new-refresh-token', newRefreshToken);
            
            // Decode admin info từ access token mới
            const secret = process.env.ACCESS_TOKEN;
            if (!secret) {
              throw new Error('ACCESS_TOKEN không được xác định trong các biến môi trường');
            }
            const decoded = jwt.verify(accessToken, secret) as { adminId?: string; sAdminId?: string; managerId?: string };
            
            if (decoded.adminId) {
              (req as any).admin = { adminId: decoded.adminId };
            } else if (decoded.sAdminId) {
              (req as any).superAdmin = { sAdminId: decoded.sAdminId };
            } else if (decoded.managerId) {
              (req as any).manager = { managerId: decoded.managerId };
            }
            
            next();
            return;
          } catch (refreshError: any) {
            res.status(401).json({ 
              success: false, 
              message: 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.',
              code: 'SESSION_EXPIRED'
            });
            return;
          }
        }
      }
      
      res.status(401).json({ 
        success: false, 
        message: 'Token không hợp lệ',
        code: 'INVALID_TOKEN'
      });
    }
  } catch (error) {
    res.status(401).json({ 
      success: false, 
      message: 'Không được phép truy cập tài nguyên này.',
      code: 'UNAUTHORIZED'
    });
  }
}; 
