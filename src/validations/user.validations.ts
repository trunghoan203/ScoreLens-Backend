import { z } from 'zod';
import { phoneNumberSchema, textSchema } from './common.validations';

export const membershipCodeSchema = z.object({
  clubId: textSchema,
  phoneNumber: phoneNumberSchema
});

export const createFeedbackSchema = z.object({
  createdBy: z.object({
    type: z.enum(["guest", "membership"]),
    userId: textSchema,
  }),
  clubInfo: z.object({
    clubId: textSchema,
  }),
  tableInfo: z.object({
    tableId: textSchema,
  }),
  content: z.string()
    .min(10, 'Nội dung phải có ít nhất 10 ký tự')
    .max(2000, 'Nội dung không được vượt quá 2000 ký tự'),
});