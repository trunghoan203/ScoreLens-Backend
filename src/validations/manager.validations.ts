import { z } from 'zod';
import {
  textSchema,
  phoneNumberSchema,
  ipAddressSchema,
  emailSchema
} from './common.validations';

export const loginManagerSchema = z.object({
  email: emailSchema,
});

export const resendLoginCodeSchema = z.object({
  email: emailSchema,
});

export const createTableSchema = z.object({
  name: textSchema,
  category: z.enum(['pool-8', 'carom']),
});

export const updateTableSchema = z.object({
  name: textSchema.optional(),
  category: z.enum(['pool-8', 'carom']).optional(),
  status: z.enum(['empty', 'inuse', 'maintenance']).optional(),
});

export const createMembershipSchema = z.object({
  fullName: textSchema,
  phoneNumber: phoneNumberSchema,
});

export const updateMembershipSchema = z.object({
  fullName: textSchema.optional(),
  phoneNumber: phoneNumberSchema.optional(),
});

export const createCameraSchema = z.object({
  tableId: textSchema,
  IPAddress: ipAddressSchema,
  username: textSchema,
  password: textSchema,
  isConnect: z.boolean(),
});

export const updateCameraSchema = z.object({
  tableId: textSchema.optional(),
  IPAddress: ipAddressSchema.optional(),
  username: textSchema.optional(),
  password: textSchema.optional(),
  isConnect: z.boolean().optional(),
});