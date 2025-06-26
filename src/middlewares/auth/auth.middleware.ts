// middlewares/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { SuperAdmin } from '../../models/SuperAdmin.model';

export const authenticateSuperAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Get token from header or cookie
    let token = req.header('Authorization')?.replace('Bearer ', '');
    
    // If no token in header, try to get from cookie
    if (!token) {
      token = req.cookies?.access_token;
    } else {}

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'No token provided'
      });
      return;
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN as string) as { sAdminId: string };

    // Find admin
    const admin = await SuperAdmin.findOne({ sAdminId: decoded.sAdminId });
    if (!admin) {
      res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
      return;
    }

    // Check if account is verified
    if (!admin.isVerified) {
      res.status(403).json({
        success: false,
        message: 'Account not verified'
      });
      return;
    }

    // Attach admin to request object
    (req as any).superAdmin = admin;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Not authorized to access this resource'
    });
  }
};