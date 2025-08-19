import { Request, Response, NextFunction } from 'express';
import { ZodError, ZodTypeAny } from 'zod';

export const validate = (
  schema: ZodTypeAny,
  target: 'body' | 'query' | 'params' = 'body'
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const dataToValidate = (req as any)[target];
    const parsed = (schema as any).safeParse(dataToValidate);

    if (!parsed.success) {
      const error = parsed.error as ZodError;
      res.status(400).json({
        success: false,
        message: 'Dữ liệu không hợp lệ',
        errors: error.flatten().fieldErrors
      });
      return;
    }

    (req as any)[target] = parsed.data;
    next();
  };
};


