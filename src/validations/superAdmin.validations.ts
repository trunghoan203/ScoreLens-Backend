import { z } from 'zod';
import { emailSchema } from './common.validations';

export const loginSuperAdminSchema = z.object({
  email: emailSchema,
});

export const updateFeedbackSchema = z.object({
  status: z.enum(["adminP", "managerP", "superadminP"]),
  note: z.string()
    .max(2000, 'Nội dung không được vượt quá 2000 ký tự'),
});