import { Request, Response, NextFunction } from 'express';

export const isGuestOrAuthenticated = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        // Kiểm tra xem có token không
        let token = req.cookies?.access_token;
        if (!token) {
            token = req.header('Authorization')?.replace('Bearer ', '');
        }

        // Nếu có token, thử xác thực
        if (token) {
            // Kiểm tra token có hợp lệ không bằng cách verify
            const jwt = require('jsonwebtoken');
            const secret = process.env.ACCESS_TOKEN;

            try {
                const decoded = jwt.verify(token, secret);
                // Nếu token hợp lệ, thực hiện xác thực bình thường
                const { isAuthenticated } = await import('./auth.middleware');
                return isAuthenticated(req, res, next);
            } catch (jwtError) {
                // Nếu token không hợp lệ, cho phép truy cập như guest
                console.log('Invalid token, allowing as guest');
            }
        }

        // Nếu không có token hoặc token không hợp lệ, cho phép truy cập như guest
        (req as any).isGuest = true;
        (req as any).guestId = `GUEST-${Date.now()}-${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`;
        next();

    } catch (error: any) {
        console.error('Guest auth middleware error:', error);
        // Nếu có lỗi, vẫn cho phép truy cập như guest
        (req as any).isGuest = true;
        (req as any).guestId = `GUEST-${Date.now()}-${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`;
        next();
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