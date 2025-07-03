import { Request, Response, NextFunction } from 'express';

// Định nghĩa một kiểu cho các hàm controller không đồng bộ
type AsyncController = (req: Request, res: Response, next: NextFunction) => Promise<any>;

/**
 * Hàm bọc (wrapper) cho các controller không đồng bộ.
 * Bắt các lỗi và chuyển chúng đến middleware xử lý lỗi tiếp theo.
 * @param fn - Hàm controller async cần được bọc.
 * @returns Một hàm Express middleware.
 */
export const catchAsync = (fn: AsyncController) => (req: Request, res: Response, next: NextFunction) => {
    // Promise.resolve đảm bảo rằng ngay cả khi fn không trả về promise, nó vẫn hoạt động.
    // .catch(next) sẽ tự động bắt lỗi và gọi next(error), chuyển lỗi đến errorHandlerMiddleware.
    Promise.resolve(fn(req, res, next)).catch(next);
};