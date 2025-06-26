// middlewares/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { SuperAdmin } from '../../models/SuperAdmin.model';
import { Admin } from '../../models/Admin.model';

export const isAuthenticated = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    let token = req.cookies?.access_token;
    if (!token) {
        token = req.header('Authorization')?.replace('Bearer ', '');
    }

    if (!token) {
      res.status(401).json({ success: false, message: 'No token provided, please login.' });
      return;
    }

    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN as string) as { sAdminId?: string; adminId?: string; iat: number, exp: number };

    if (decoded.sAdminId) {
        const superAdmin = await SuperAdmin.findOne({ sAdminId: decoded.sAdminId });
        if (!superAdmin || !superAdmin.isVerified) {
            res.status(401).json({ success: false, message: 'Invalid token or user not verified.' });
            return;
        }
        (req as any).superAdmin = superAdmin;
    } else if (decoded.adminId) {
        const admin = await Admin.findOne({ adminId: decoded.adminId });
        if (!admin || !admin.isVerified) {
            res.status(401).json({ success: false, message: 'Invalid token or user not verified.' });
            return;
        }
        (req as any).admin = admin;
    } else {
        res.status(401).json({ success: false, message: 'Invalid token payload.' });
        return;
    }

    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Not authorized to access this resource.' });
  }
};