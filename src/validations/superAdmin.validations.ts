import { z } from 'zod';
import { emailSchema } from './common.validations';

export const loginSuperAdminSchema = z.object({
  email: emailSchema,
});

export const updateFeedbackSchema = z.object({
  content: z.string()
    .min(10, 'Nội dung phải có ít nhất 10 ký tự')
    .max(2000, 'Nội dung không được vượt quá 2000 ký tự'),
});