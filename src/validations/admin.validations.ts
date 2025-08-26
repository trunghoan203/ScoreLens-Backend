import { z } from 'zod';
import {
  emailSchema,
  passwordSchema,
  textSchema,
  phoneNumberSchema,
  urlSchema,
  imageUrlSchema,
  dateOfBirthSchema,
  addressSchema,
  citizenCodeSchema
} from './common.validations';

export const adminRegisterSchema = z.object({
  fullName: textSchema,
  email: emailSchema,
  password: passwordSchema,
});

export const adminLoginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const createBrandSchema = z.object({
  brandName: textSchema,
  phoneNumber: phoneNumberSchema,
  website: urlSchema.optional(),
  logo_url: imageUrlSchema,
  citizenCode: citizenCodeSchema,
});

export const updateBrandSchema = z.object({
  brandName: textSchema.optional(),
  phoneNumber: phoneNumberSchema.optional(),
  website: urlSchema.optional(),
  logo_url: imageUrlSchema.optional(),
  citizenCode: citizenCodeSchema.optional(),
});

const clubPayloadSchema = z.object({
  clubName: textSchema,
  address: addressSchema,
  phoneNumber: phoneNumberSchema,
  tableNumber: z.number().min(1, 'Số bàn ít nhất là 1'),
  status: z.string().optional(),
});

export const createClubSchema = z.union([
  clubPayloadSchema,
  z.array(clubPayloadSchema).min(1, 'Danh sách club không được rỗng')
]);

export const updateClubSchema = z.object({
  clubName: textSchema.optional(),
  address: addressSchema.optional(),
  phoneNumber: phoneNumberSchema.optional(),
  tableNumber: z.number().min(1, 'Số bàn ít nhất là 1').optional(),
  status: z.string().optional(),
});

export const createManagerSchema = z.object({
  clubId: z.string(),
  fullName: textSchema,
  phoneNumber: phoneNumberSchema,
  dateOfBirth: dateOfBirthSchema,
  email: emailSchema,
  citizenCode: citizenCodeSchema,
  address: addressSchema,
});

export const updateManagerSchema = z.object({
  clubId: z.string().optional(),
  fullName: textSchema.optional(),
  phoneNumber: phoneNumberSchema.optional(),
  dateOfBirth: dateOfBirthSchema.optional(),
  email: emailSchema.optional(),
  citizenCode: citizenCodeSchema.optional(),
  address: addressSchema.optional(),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const setNewPasswordSchema = z.object({
  email: emailSchema,
  newPassword: passwordSchema,
});

export const verifyResetCodeSchema = z.object({
  email: emailSchema,
  resetCode: z.string().min(6, 'Mã xác thực phải có ít nhất 6 ký tự').max(6, 'Mã xác thực phải có đúng 6 ký tự'),
});

export const resendVerificationCodeSchema = z.object({
  email: emailSchema,
});

export const resendResetPasswordCodeSchema = z.object({
  email: emailSchema,
});
