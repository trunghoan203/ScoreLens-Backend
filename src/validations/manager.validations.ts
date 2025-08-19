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

export const createTableSchema = z.object({
  name: textSchema,
});

export const updateTableSchema = z.object({
  name: textSchema.optional(),
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
  IPAddress: ipAddressSchema,
  username: textSchema,
  password: textSchema,
});

export const updateCameraSchema = z.object({
  IPAddress: ipAddressSchema.optional(),
  username: textSchema.optional(),
  password: textSchema.optional(),
});