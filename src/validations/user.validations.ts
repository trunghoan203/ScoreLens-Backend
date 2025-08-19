import { z } from 'zod';
import { phoneNumberSchema, textSchema } from './common.validations';

export const membershipCodeSchema = z.object({
  clubId: textSchema,
  phoneNumber: phoneNumberSchema
});

export const createFeedbackSchema = z.object({
  content: z.string()
    .min(10, 'Nội dung phải có ít nhất 10 ký tự')
    .max(2000, 'Nội dung không được vượt quá 2000 ký tự'),
});