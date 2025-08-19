import { z } from 'zod';

export const emailSchema = z.string().email('Email không hợp lệ');

export const textSchema = z.string().min(2, 'Tên phải có ít nhất 2 ký tự').max(255, 'Tên không được vượt quá 255 ký tự');

export const citizenCodeSchema = z.string()
  .regex(/^\d{12}$/, "CCCD phải có đúng 12 chữ số")
  .refine((cccd) => {
    const provinceCode = parseInt(cccd.slice(0, 3), 10);
    return provinceCode >= 1 && provinceCode <= 96;
  }, { message: "Mã tỉnh/thành phố không hợp lệ" })
  .refine((cccd) => {
    const genderCentury = parseInt(cccd[3], 10);
    return genderCentury >= 0 && genderCentury <= 9;
  }, { message: "Mã giới tính/thế kỷ không hợp lệ" })
  .refine((cccd) => {
    const yearTwoDigits = parseInt(cccd.slice(4, 6), 10);
    return yearTwoDigits >= 0 && yearTwoDigits <= 99;
  }, { message: "Năm sinh không hợp lệ" });

export const passwordSchema = z.string()
  .min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_])/,
    'Mật khẩu phải chứa ít nhất 1 chữ hoa, 1 chữ thường, 1 số và 1 ký tự đặc biệt'
  );

export const phoneNumberSchema = z.string()
  .regex(
    /^(\+84|84|0)(3|5|7|8|9)[0-9]{8}$/,
    'Số điện thoại không hợp lệ'
  );

export const urlSchema = z.string().regex(
  /^https:\/\/[^\s/$.?#].[^\s]*$/i,
  'URL không hợp lệ, phải bắt đầu bằng https://'
);

export const addressSchema = z.string()
  .min(20, 'Địa chỉ phải có ít nhất 20 ký tự')
  .max(255, 'Địa chỉ không được vượt quá 255 ký tự');

export const dateOfBirthSchema = z.string()
  .regex(
    /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/,
    "Ngày sinh không hợp lệ (định dạng phải là dd/mm/yyyy)"
  )
  .refine((dateStr) => {
    const [day, month, year] = dateStr.split("/").map(Number);
    const dob = new Date(year, month - 1, day);
    const today = new Date();

    const isValidDate =
      dob.getFullYear() === year &&
      dob.getMonth() === month - 1 &&
      dob.getDate() === day;

    return isValidDate && dob <= today;
  }, {
    message: "Ngày sinh không hợp lệ hoặc ở tương lai",
  });

export const ipAddressSchema = z.string().regex(
  /^(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)){3}$/,
  "Địa chỉ IP không hợp lệ"
  );