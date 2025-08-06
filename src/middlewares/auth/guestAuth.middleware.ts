import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Membership } from '../../models/Membership.model';

export const isGuestOrAuthenticated = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        let token = req.cookies?.access_token || req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            (req as any).isGuest = true;
            (req as any).user = null;
            return next();
        }

        const secret = process.env.ACCESS_TOKEN;
        if (!secret) {
            throw new Error('ACCESS_TOKEN secret is not defined in environment variables');
        }

        const decoded = jwt.verify(token, secret) as any;

        if (decoded.membershipId) {
            const membership = await Membership.findOne({ membershipId: decoded.membershipId });
            if (!membership) {
                res.status(401).json({ success: false, message: 'Invalid token: Membership not found.' });
                return;
            }
            (req as any).isGuest = false;
            (req as any).membershipId = membership.membershipId;
            (req as any).membership = membership;
        } else if (decoded.managerId) {
            (req as any).isGuest = false;
            (req as any).managerId = decoded.managerId;
        } else {
             res.status(401).json({ success: false, message: 'Invalid token payload.' });
             return;
        }

        next();

    } catch (error: any) {
        console.error('Auth middleware error:', error.name);
        res.status(401).json({
            success: false,
            message: `Authentication failed: ${error.message}`,
            code: error.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN'
        });
    }
};

export const isGuestOnly = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        // Kiểm tra xem có token không
        let token = req.cookies?.access_token;
        if (!token) {
            token = req.header('Authorization')?.replace('Bearer ', '');
        }

        // Nếu có token, từ chối truy cập
        if (token) {
            res.status(403).json({
                success: false,
                message: 'This endpoint is for guests only.',
                code: 'GUEST_ONLY'
            });
            return;
        }

        // Nếu không có token, cho phép truy cập như guest
        (req as any).isGuest = true;
        (req as any).guestId = `GUEST-${Date.now()}-${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`;

        next();
    } catch (error: any) {
        console.error('Guest only middleware error:', error);
        res.status(401).json({
            success: false,
            message: 'Authentication failed.',
            code: 'AUTH_FAILED'
        });
    }
}; 