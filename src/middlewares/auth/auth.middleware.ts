import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { SuperAdmin } from '../../models/SuperAdmin.model';
import { Admin } from '../../models/Admin.model';
import { Manager } from '../../models/Manager.model';

export const isAuthenticated = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    let token = req.cookies?.access_token;
    if (!token) {
      token = req.header('Authorization')?.replace('Bearer ', '');
    }

    if (!token) {
      res.status(401).json({ success: false, message: 'Không có token được cung cấp, vui lòng đăng nhập.' });
      return;
    }

    const secret = process.env.ACCESS_TOKEN;
    if (!secret) {
      throw new Error('ACCESS_TOKEN không được xác định trong các biến môi trường');
    }
    const decoded = (jwt as any).verify(token, secret) as { sAdminId?: string; adminId?: string; managerId?: string; iat: number, exp: number };

    if (decoded.sAdminId) {
      const superAdmin = await SuperAdmin.findOne({ sAdminId: decoded.sAdminId });
      if (!superAdmin || !superAdmin.isVerified) {
        res.status(401).json({ success: false, message: 'Token không hợp lệ hoặc người dùng chưa được xác thực.' });
        return;
      }
      (req as any).superAdmin = superAdmin;
    } else if (decoded.adminId) {
      const admin = await Admin.findOne({ adminId: decoded.adminId });
      if (!admin || !admin.isVerified) {
        res.status(401).json({ success: false, message: 'Token không hợp lệ hoặc người dùng chưa được xác thực.' });
        return;
      }
      (req as any).admin = admin;
    } else if (decoded.managerId) {
      const manager = await Manager.findOne({ managerId: decoded.managerId });
      if (!manager) {
        res.status(401).json({ success: false, message: 'Token không hợp lệ hoặc người dùng chưa được xác thực.' });
        return;
      }
      (req as any).manager = manager;
    } else {
      res.status(401).json({ success: false, message: 'Dữ liệu token không hợp lệ.' });
      return;
    }

    next();
  } catch (error: any) {

    // Phân loại lỗi cụ thể
    if (error.name === 'TokenExpiredError') {
      res.status(401).json({
        success: false,
        message: 'Token đã hết hạn, vui lòng đăng nhập lại.',
        code: 'TOKEN_EXPIRED'
      });
    } else if (error.name === 'JsonWebTokenError') {
      res.status(401).json({
        success: false,
        message: 'Định dạng token không hợp lệ.',
        code: 'INVALID_TOKEN'
      });
    } else {
      res.status(401).json({
        success: false,
        message: 'Không được phép truy cập tài nguyên này.',
        code: 'UNAUTHORIZED',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
};