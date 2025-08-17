import { ErrorRequestHandler, NextFunction, Request, Response } from 'express';
import ErrorHandler from '../../utils/ErrorHandler';
import { MESSAGES } from '../../config/messages';

export const errorHandlerMiddleware: ErrorRequestHandler = (
    error,
    req: Request,
    res: Response,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    next: NextFunction
) => {
    error.statusCode = error.statusCode || 500;
    error.message = error.message || MESSAGES.MSG100;

    // wrong mongodb id error
    if (error.name === 'CastError') {
        const message = `Không tìm thấy tài nguyên. Không hợp lệ: ${error.path}`;
        error = new ErrorHandler(message, 400);
    }

    // Duplicate key error
    if (error.code === 11000) {
        const message = `Dữ liệu trùng lặp ${Object.keys(error.keyValue)} đã được nhập`;
        error = new ErrorHandler(message, 400);
    }

    // Wrong JWT error
    if (error.name === 'JsonWebTokenError') {
        const message = MESSAGES.MSG103;
        error = new ErrorHandler(message, 400);
    }

    // JWT expired error
    if (error.name === 'TokenExpiredError') {
        const message = MESSAGES.MSG104;
        error = new ErrorHandler(message, 400);
    }

    res.status(error.statusCode).json({
        success: false,
        message: error.message
    });
};

export default errorHandlerMiddleware;
