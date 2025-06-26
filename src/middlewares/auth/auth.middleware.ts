import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { SuperAdmin } from '../../models/SuperAdmin.model';
import { ISuperAdmin } from '../../interfaces/SuperAdmin.interface';

declare global {
  namespace Express {
    interface Request {
      superAdmin?: ISuperAdmin;
    }
  }
}

export const authenticateSuperAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = req.cookies.access_token;

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Authentication failed: No token provided.'
      });
      return;
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN!) as { sAdminId: string };
    if (!decoded.sAdminId) {
        res.status(401).json({ success: false, message: 'Authentication failed: Invalid token payload.' });
        return;
    }
    // Find admin
    const admin = await SuperAdmin.findOne({ sAdminId: decoded.sAdminId });
    if (!admin) {
      res.status(401).json({
        success: false,
        message: 'Authentication failed: User not found.'
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
    req.superAdmin = admin;
    next();
  } catch (error) {
    console.error('Error authenticating super admin:', error);
    res.status(401).json({
      success: false,
      message: 'Not authorized. Token may be invalid or expired.'
    });
  }
};