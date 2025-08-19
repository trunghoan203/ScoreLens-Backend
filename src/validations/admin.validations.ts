import { z } from 'zod';
import { 
  emailSchema, 
  passwordSchema, 
  textSchema, 
  phoneNumberSchema, 
  urlSchema, 
  dateOfBirthSchema, 
  addressSchema, 
  citizenCodeSchema
} from './common.validations';

// Admin registration validation
export const adminRegisterSchema = z.object({
  fullName: textSchema,
  email: emailSchema,
  password: passwordSchema,
});

// Admin login validation
export const adminLoginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

// Create brand validation
export const createBrandSchema = z.object({
  brandName: textSchema,
  phoneNumber: phoneNumberSchema,
  website: urlSchema,
  citizenCode: citizenCodeSchema,
});

// Update brand validation
export const updateBrandSchema = z.object({
  brandName: textSchema.optional(),
  phoneNumber: phoneNumberSchema.optional(),
  website: urlSchema.optional(),
  citizenCode: citizenCodeSchema.optional(),
});

// Create club validation
export const createClubSchema = z.object({
  clubName: textSchema,
  address: addressSchema,
  phoneNumber: phoneNumberSchema,
  tableNumber: z.number().min(1, 'Số bàn ít nhất là 1')
});

// Update club validation
export const updateClubSchema = z.object({
  clubName: textSchema.optional(),
  address: addressSchema.optional(),
  phoneNumber: phoneNumberSchema.optional(),
  tableNumber: z.number().min(1, 'Số bàn ít nhất là 1').optional()
});

// Manager creation validation
export const createManagerSchema = z.object({
  fullName: textSchema,
  phoneNumber: phoneNumberSchema,
  dateOfBirth: dateOfBirthSchema,
  email: emailSchema,
  citizenCode: citizenCodeSchema,
  address: addressSchema,
});

// Manager update validation
export const updateManagerSchema = z.object({
  fullName: textSchema.optional(),
  phoneNumber: phoneNumberSchema.optional(),
  dateOfBirth: dateOfBirthSchema.optional(),
  email: emailSchema.optional(),
  citizenCode: citizenCodeSchema.optional(),
  address: addressSchema.optional(),
});
