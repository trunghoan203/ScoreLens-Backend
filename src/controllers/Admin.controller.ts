import { Request, Response, NextFunction } from 'express';
import { Admin } from '../models/Admin.model';
import { sendToken } from '../utils/jwt';
import { generateRandomCode } from '../utils/helpers';
import sendMail from '../utils/sendMail';
import * as AdminService from '../services/Admin.service';
import ErrorHandler from '../utils/ErrorHandler';
import { catchAsync } from '../utils/catchAsync';
import { Brand } from '../models/Brand.model';

export const registerAdmin = async (req: Request, res: Response): Promise<void> => {
    try {
        const { fullName, email, password } = req.body;

        if (!fullName || !email || !password) {
            res.status(400).json({ success: false, message: 'Please provide fullName, email, and password' });
            return;
        }

        const existingAdmin = await Admin.findOne({ email });
        if (existingAdmin) {
            res.status(400).json({ success: false, message: 'Email already registered' });
            return;
        }

        const adminId = `AD-${Date.now()}`;
        const activationCode = generateRandomCode(6);
        const activationCodeExpires = new Date(Date.now() + 10 * 60 * 1000);

        const newAdmin = await Admin.create({
            adminId,
            fullName,
            email,
            password,
            activationCode,
            activationCodeExpires
        });

        await sendMail({
            email: newAdmin.email,
            subject: 'ScoreLens - Admin Email Verification',
            template: 'activation-mail.ejs',
            data: {
                user: { name: newAdmin.fullName },
                activationCode
            }
        });

        res.status(201).json({
            success: true,
            message: `Activation code sent to ${newAdmin.email}. It will expire in 10 minutes.`,
        });

    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const verifyAdmin = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, activationCode } = req.body;

        const admin = await Admin.findOne({ email }).select('+activationCode');
        if (!admin) {
            res.status(404).json({ success: false, message: 'Admin not found' });
            return;
        }

        if (admin.isVerified) {
            res.status(400).json({ success: false, message: 'Account already verified' });
            return;
        }

        if (admin.activationCode !== activationCode) {
            res.status(400).json({ success: false, message: 'Invalid activation code' });
            return;
        }

        if (admin.activationCodeExpires && new Date() > admin.activationCodeExpires) {
            res.status(400).json({ success: false, message: 'Activation code expired' });
            return;
        }

        admin.isVerified = true;
        admin.activationCode = null;
        admin.activationCodeExpires = null;
        await admin.save();

        res.status(200).json({
            success: true,
            message: 'Account verified successfully. You can now log in.',
        });

    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const loginAdmin = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            res.status(400).json({ success: false, message: 'Please provide email and password' });
            return;
        }

        const admin = await Admin.findOne({ email }).select('+password');
        if (!admin) {
            res.status(404).json({ success: false, message: 'Invalid credentials' });
            return;
        }

        if (!admin.isVerified) {
            res.status(403).json({ success: false, message: 'Account not verified. Please check your email for verification code.' });
            return;
        }

        const isPasswordMatched = await (admin as any).comparePassword(password);
        if (!isPasswordMatched) {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
            return;
        }

        admin.lastLogin = new Date();
        await admin.save();

        sendToken(admin, 200, res);

    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const logoutAdmin = async (req: Request, res: Response): Promise<void> => {
    try {
        res.cookie('access_token', '', { maxAge: 1 });
        res.cookie('refresh_token', '', { maxAge: 1 });
        res.status(200).json({ success: true, message: 'Logged out successfully' });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getAdminProfile = async (req: Request & { admin?: any }, res: Response): Promise<void> => {
    try {
        const adminId = req.admin.adminId;
        const admin = await Admin.findOne({ adminId: adminId });

        if (!admin) {
            res.status(404).json({ success: false, message: 'Admin not found' });
            return;
        }

        res.status(200).json({ success: true, admin });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email } = req.body;

        if (!email) {
            res.status(400).json({ success: false, message: 'Please provide email' });
            return;
        }

        const admin = await Admin.findOne({ email });
        if (!admin) {
            res.status(404).json({ success: false, message: 'Admin not found' });
            return;
        }

        if (!admin.isVerified) {
            res.status(403).json({ success: false, message: 'Account not verified' });
            return;
        }

        const resetCode = generateRandomCode(6);
        const resetCodeExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        admin.activationCode = resetCode;
        admin.activationCodeExpires = resetCodeExpires;
        await admin.save({ validateBeforeSave: false });

        await sendMail({
            email: admin.email,
            subject: 'ScoreLens - Reset Password Code',
            template: 'activation-mail.ejs',
            data: {
                user: { name: admin.fullName },
                activationCode: resetCode
            }
        });

        res.status(200).json({
            success: true,
            message: `Password reset code sent to ${admin.email}. It will expire in 10 minutes.`
        });

    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, resetCode, newPassword } = req.body;

        if (!email || !resetCode || !newPassword) {
            res.status(400).json({ success: false, message: 'Please provide email, reset code, and new password' });
            return;
        }

        const admin = await Admin.findOne({ email }).select('+activationCode');
        if (!admin) {
            res.status(404).json({ success: false, message: 'Admin not found' });
            return;
        }

        if (!admin.activationCode || admin.activationCode !== resetCode) {
            res.status(400).json({ success: false, message: 'Invalid reset code' });
            return;
        }

        if (admin.activationCodeExpires && new Date() > admin.activationCodeExpires) {
            res.status(400).json({ success: false, message: 'Reset code expired' });
            return;
        }

        // Update password
        admin.password = newPassword;
        admin.activationCode = null;
        admin.activationCodeExpires = null;
        await admin.save();

        res.status(200).json({
            success: true,
            message: 'Password reset successfully. You can now login with your new password.'
        });

    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const verifyResetCode = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, resetCode } = req.body;

        if (!email || !resetCode) {
            res.status(400).json({ success: false, message: 'Please provide email and reset code' });
            return;
        }

        const admin = await Admin.findOne({ email }).select('+activationCode');
        if (!admin) {
            res.status(404).json({ success: false, message: 'Admin not found' });
            return;
        }

        if (!admin.activationCode || admin.activationCode !== resetCode) {
            res.status(400).json({ success: false, message: 'Invalid reset code' });
            return;
        }

        if (admin.activationCodeExpires && new Date() > admin.activationCodeExpires) {
            res.status(400).json({ success: false, message: 'Reset code expired' });
            return;
        }

        // Clear the reset code after successful verification
        admin.activationCode = null;
        admin.activationCodeExpires = null;
        await admin.save({ validateBeforeSave: false });

        res.status(200).json({
            success: true,
            message: 'Reset code verified successfully. You can now set your new password.'
        });

    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const setNewPassword = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, newPassword } = req.body;

        if (!email || !newPassword) {
            res.status(400).json({ success: false, message: 'Please provide email and new password' });
            return;
        }

        const admin = await Admin.findOne({ email }).select('+activationCode');
        if (!admin) {
            res.status(404).json({ success: false, message: 'Admin not found' });
            return;
        }

        // Check if reset code was already verified (activationCode should be null)
        if (admin.activationCode !== null) {
            res.status(400).json({ success: false, message: 'Please verify your reset code first' });
            return;
        }

        // Update password
        admin.password = newPassword;
        await admin.save();

        res.status(200).json({
            success: true,
            message: 'Password updated successfully. You can now login with your new password.'
        });

    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const createManager = catchAsync(async (req: Request & { admin?: any }, res: Response, next: NextFunction) => {
    const { fullName, email, phoneNumber, dateOfBirth, citizenCode, address, clubId } = req.body;

    const adminId = req.admin?.adminId;
    if (!adminId) {
        return next(new ErrorHandler('Authentication error: Admin ID not found in token.', 401));
    }

    if (!fullName || !email || !phoneNumber || !dateOfBirth || !citizenCode || !address || !clubId) {
        return next(new ErrorHandler('Vui lòng điền đầy đủ tất cả các trường bắt buộc.', 400));
    }

    const newManager = await AdminService.createManagerByAdmin(adminId.toString(), {
        fullName,
        email,
        phoneNumber,
        dateOfBirth,
        citizenCode,
        address,
        clubId
    });

    res.status(201).json({
        success: true,
        message: 'Tài khoản Manager đã được tạo thành công.',
        data: newManager,
    });
});

export const updateManager = catchAsync(async (req: Request & { admin?: any }, res: Response, next: NextFunction) => {
    const { managerId } = req.params;
    const updateData = req.body;

    const adminId = req.admin?.adminId;
    if (!adminId) {
        return next(new ErrorHandler('Authentication error: Admin ID not found in token.', 401));
    }

    if (!managerId) {
        return next(new ErrorHandler('Manager ID là bắt buộc.', 400));
    }

    const updatedManager = await AdminService.updateManagerByAdmin(adminId.toString(), managerId, updateData);

    res.status(200).json({
        success: true,
        message: 'Thông tin Manager đã được cập nhật thành công.',
        data: updatedManager,
    });
});

export const deleteManager = catchAsync(async (req: Request & { admin?: any }, res: Response, next: NextFunction) => {
    const { managerId } = req.params;

    const adminId = req.admin?.adminId;
    if (!adminId) {
        return next(new ErrorHandler('Authentication error: Admin ID not found in token.', 401));
    }

    if (!managerId) {
        return next(new ErrorHandler('Manager ID là bắt buộc.', 400));
    }

    await AdminService.deleteManagerByAdmin(adminId.toString(), managerId);

    res.status(200).json({
        success: true,
        message: 'Manager đã được xóa thành công.',
    });
});

export const deactivateManager = catchAsync(async (req: Request & { admin?: any }, res: Response, next: NextFunction) => {
    const { managerId } = req.params;

    const adminId = req.admin?.adminId;
    if (!adminId) {
        return next(new ErrorHandler('Authentication error: Admin ID not found in token.', 401));
    }

    if (!managerId) {
        return next(new ErrorHandler('Manager ID là bắt buộc.', 400));
    }

    const deactivatedManager = await AdminService.deactivateManagerByAdmin(adminId.toString(), managerId);

    res.status(200).json({
        success: true,
        message: 'Manager đã được vô hiệu hóa thành công.',
        data: deactivatedManager,
    });
});

export const getAllManagers = catchAsync(async (req: Request & { admin?: any }, res: Response, next: NextFunction) => {
    // Có thể kiểm tra quyền admin ở đây nếu cần
    const managers = await AdminService.getAllManagersByAdmin();
    res.status(200).json({
        success: true,
        data: managers,
    });
});

// Tạo brand mới
export const createBrand = async (req: Request & { admin?: any }, res: Response): Promise<void> => {
    try {
        const adminId = req.admin.adminId;
        // Kiểm tra admin đã có brand chưa
        const existed = await Brand.findOne({ adminId });
        if (existed) {
            res.status(400).json({ success: false, message: 'Admin đã có brand, không thể tạo thêm.' });
            return;
        }
        const { brandName, numberPhone, website, logo_url, citizenCode } = req.body;
        if (!brandName || !numberPhone || !website || !citizenCode) {
            res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ thông tin brand.' });
            return;
        }
        const brandId = `BR-${Date.now()}`;
        const brand = await Brand.create({
            brandId,
            adminId,
            brandName,
            numberPhone,
            website,
            logo_url,
            citizenCode
        });
        res.status(201).json({ success: true, brand });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Sửa thông tin brand
export const updateBrand = async (req: Request & { admin?: any }, res: Response): Promise<void> => {
    try {
        const adminId = req.admin.adminId;
        const { brandId } = req.params;
        const { brandName, numberPhone, website, logo_url, citizenCode } = req.body;
        const brand = await Brand.findOne({ brandId, adminId });
        if (!brand) {
            res.status(404).json({ success: false, message: 'Brand không tồn tại hoặc bạn không có quyền.' });
            return;
        }
        if (brandName !== undefined) brand.brandName = brandName;
        if (numberPhone !== undefined) brand.numberPhone = numberPhone;
        if (website !== undefined) brand.website = website;
        if (logo_url !== undefined) brand.logo_url = logo_url;
        if (citizenCode !== undefined) brand.citizenCode = citizenCode;
        await brand.save();
        res.status(200).json({ success: true, brand });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Lấy danh sách brand của admin
export const getBrands = async (req: Request & { admin?: any }, res: Response): Promise<void> => {
    try {
        const adminId = req.admin.adminId;
        const brands = await Brand.find({ adminId });
        res.status(200).json({ success: true, brands });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
}; 
