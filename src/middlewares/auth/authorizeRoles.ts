// import ErrorHandler from '../../utils/ErrorHandler';
// import { NextFunction, Request, Response } from 'express';

// export const authorizeRoles = (...roles: string[]) => {
//     return (req: Request, res: Response, next: NextFunction) => {
//         if (!roles.includes(req.user?.role || '')) {
//             return next(new ErrorHandler(`Role ${req.user?.role} is not allowed to access this resource`, 403));
//         }
//         next();
//     };
// };
