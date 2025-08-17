import { Request, Response, NextFunction } from 'express';
import { Admin } from '../models/Admin.model';
import { sendToken } from '../utils/jwt';
import { generateRandomCode } from '../utils/helpers';
import sendMail from '../utils/sendMail';
import * as AdminService from '../services/Admin.service';
import ErrorHandler from '../utils/ErrorHandler';
import { catchAsync } from '../utils/catchAsync';
import { Brand } from '../models/Brand.model';
import { Club } from '../models/Club.model';
import { Manager } from '../models/Manager.model';
import { Membership } from '../models/Membership.model';
import { Table } from '../models/Table.model';
import { Camera } from '../models/Camera.model';
import { Feedback } from '../models/Feedback.model';
import { Match } from '../models/Match.model';

export const registerAdmin = async (req: Request, res: Response): Promise<void> => {
    try {
        const { fullName, email, password } = req.body;

        if (!fullName || !email || !password) {
            res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ họ tên, email và mật khẩu' });
            return;
        }

        const existingAdmin = await Admin.findOne({ email });
        if (existingAdmin) {
            res.status(400).json({ success: false, message: 'Email đã được đăng ký' });
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
            res.status(404).json({ success: false, message: 'Admin không tồn tại' });
            return;
        }

        if (admin.isVerified) {
            res.status(400).json({ success: false, message: 'Tài khoản đã được xác thực' });
            return;
        }

        if (admin.activationCode !== activationCode) {
            res.status(400).json({ success: false, message: 'Mã xác thực không hợp lệ' });
            return;
        }

        if (admin.activationCodeExpires && new Date() > admin.activationCodeExpires) {
            res.status(400).json({ success: false, message: 'Mã xác thực đã hết hạn' });
            return;
        }

        admin.isVerified = true;
        admin.activationCode = null;
        admin.activationCodeExpires = null;
        await admin.save();

        res.status(200).json({
            success: true,
            message: 'Tài khoản đã được xác thực thành công. Bạn có thể đăng nhập ngay bây giờ.',
        });

    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const loginAdmin = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password, rememberMe } = req.body;

        if (!email || !password) {
            res.status(400).json({ success: false, message: 'Vui lòng nhập email và mật khẩu' });
            return;
        }

        const admin = await Admin.findOne({ email }).select('+password');
        if (!admin) {
            res.status(404).json({ success: false, message: 'Thông tin đăng nhập không hợp lệ' });
            return;
        }

        if (!admin.isVerified) {
            res.status(403).json({ success: false, message: 'Tài khoản chưa được xác thực. Vui lòng kiểm tra email để nhận mã xác thực.' });
            return;
        }

        const isPasswordMatched = await (admin as any).comparePassword(password);
        if (!isPasswordMatched) {
            res.status(401).json({ success: false, message: 'Thông tin đăng nhập không hợp lệ' });
            return;
        }

        admin.lastLogin = new Date();
        await admin.save();

        // Tạo access token
        const accessToken = admin.signAccessToken();
        
        // Tạo refresh token với remember me option
        const { RememberPasswordService } = await import('../services/RememberPassword.service');
        const { token: refreshToken, expiresAt } = await RememberPasswordService.createRefreshToken(
            admin.adminId, 
            rememberMe === true
        );

        // Tính thời gian hết hạn
        const accessTokenExpiresIn = process.env.JWT_ACCESS_EXPIRES_IN || '1d';
        const expiresIn = parseExpiresIn(accessTokenExpiresIn);

        res.status(200).json({
            success: true,
            data: {
                accessToken,
                refreshToken,
                expiresIn,
                refreshExpiresIn: Math.floor((expiresAt.getTime() - Date.now()) / 1000),
                admin: {
                    id: admin.adminId,
                    email: admin.email,
                    fullName: admin.fullName,
                    brandId: admin.brandId
                }
            }
        });

    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Helper function để parse expiresIn
function parseExpiresIn(expiresIn: string): number {
    if (expiresIn.includes('d')) {
        return parseInt(expiresIn) * 24 * 60 * 60;
    } else if (expiresIn.includes('h')) {
        return parseInt(expiresIn) * 60 * 60;
    } else if (expiresIn.includes('m')) {
        return parseInt(expiresIn) * 60;
    } else {
        return parseInt(expiresIn);
    }
}

export const logoutAdmin = async (req: Request, res: Response): Promise<void> => {
    try {
        const { refreshToken } = req.body;
        
        if (refreshToken) {
            const { RememberPasswordService } = await import('../services/RememberPassword.service');
            await RememberPasswordService.revokeRefreshToken(refreshToken);
        }
        
        res.cookie('access_token', '', { maxAge: 1 });
        res.cookie('refresh_token', '', { maxAge: 1 });
        res.status(200).json({ success: true, message: 'Đăng xuất thành công' });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const refreshToken = async (req: Request, res: Response): Promise<void> => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            res.status(400).json({ success: false, message: 'Refresh token là bắt buộc' });
            return;
        }

        const { RememberPasswordService } = await import('../services/RememberPassword.service');
        const { accessToken, refreshToken: newRefreshToken } = await RememberPasswordService.refreshAccessToken(refreshToken);

        const accessTokenExpiresIn = process.env.JWT_ACCESS_EXPIRES_IN || '1d';
        const expiresIn = parseExpiresIn(accessTokenExpiresIn);

        res.status(200).json({
            success: true,
            data: {
                accessToken,
                refreshToken: newRefreshToken,
                expiresIn
            }
        });

    } catch (error: any) {
        if (error.message.includes('Invalid') || error.message.includes('expired') || error.message.includes('revoked')) {
            res.status(401).json({ success: false, message: error.message });
        } else {
            res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ' });
        }
    }
};

export const getAdminProfile = async (req: Request & { admin?: any }, res: Response): Promise<void> => {
    try {
        const adminId = req.admin.adminId;
        const admin = await Admin.findOne({ adminId: adminId });

        if (!admin) {
            res.status(404).json({ success: false, message: 'Admin không tồn tại' });
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
            res.status(400).json({ success: false, message: 'Vui lòng cung cấp email' });
            return;
        }

        const admin = await Admin.findOne({ email });
        if (!admin) {
            res.status(404).json({ success: false, message: 'Admin không tồn tại' });
            return;
        }

        if (!admin.isVerified) {
            res.status(403).json({ success: false, message: 'Tài khoản chưa được xác thực' });
            return;
        }

        const resetCode = generateRandomCode(6);
        const resetCodeExpires = new Date(Date.now() + 10 * 60 * 1000);

        admin.activationCode = resetCode;
        admin.activationCodeExpires = resetCodeExpires;
        await admin.save({ validateBeforeSave: false });

        await sendMail({
            email: admin.email,
            subject: 'ScoreLens - Mã Đặt Lại Mật Khẩu',
            template: 'activation-mail.ejs',
            data: {
                user: { name: admin.fullName },
                activationCode: resetCode
            }
        });

        res.status(200).json({
            success: true,
            message: `Mã đặt lại mật khẩu đã được gửi đến ${admin.email}. Mã này sẽ hết hạn trong 10 phút.`
        });

    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, resetCode, newPassword } = req.body;

        if (!email || !resetCode || !newPassword) {
            res.status(400).json({ success: false, message: 'Vui lòng cung cấp email, mã đặt lại và mật khẩu mới' });
            return;
        }

        const admin = await Admin.findOne({ email }).select('+activationCode');
        if (!admin) {
            res.status(404).json({ success: false, message: 'Admin không tồn tại' });
            return;
        }

        if (!admin.activationCode || admin.activationCode !== resetCode) {
            res.status(400).json({ success: false, message: 'Mã đặt lại không hợp lệ' });
            return;
        }

        if (admin.activationCodeExpires && new Date() > admin.activationCodeExpires) {
            res.status(400).json({ success: false, message: 'Mã đặt lại đã hết hạn' });
            return;
        }

        // Update password
        admin.password = newPassword;
        admin.activationCode = null;
        admin.activationCodeExpires = null;
        await admin.save();

        res.status(200).json({
            success: true,
            message: 'Đặt lại mật khẩu thành công. Bạn có thể đăng nhập với mật khẩu mới.'
        });

    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const verifyResetCode = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, resetCode } = req.body;

        if (!email || !resetCode) {
            res.status(400).json({ success: false, message: 'Vui lòng cung cấp email và mã đặt lại' });
            return;
        }

        const admin = await Admin.findOne({ email }).select('+activationCode');
        if (!admin) {
            res.status(404).json({ success: false, message: 'Admin không tồn tại' });
            return;
        }

        if (!admin.activationCode || admin.activationCode !== resetCode) {
            res.status(400).json({ success: false, message: 'Mã đặt lại không hợp lệ' });
            return;
        }

        if (admin.activationCodeExpires && new Date() > admin.activationCodeExpires) {
            res.status(400).json({ success: false, message: 'Mã đặt lại đã hết hạn' });
            return;
        }

        // Clear the reset code after successful verification
        admin.activationCode = null;
        admin.activationCodeExpires = null;
        await admin.save({ validateBeforeSave: false });

        res.status(200).json({
            success: true,
            message: 'Mã đặt lại đã được xác thực thành công. Bạn có thể đặt mật khẩu mới.'
        });

    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const setNewPassword = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, newPassword } = req.body;

        if (!email || !newPassword) {
            res.status(400).json({ success: false, message: 'Vui lòng cung cấp email và mật khẩu mới' });
            return;
        }

        const admin = await Admin.findOne({ email }).select('+activationCode');
        if (!admin) {
            res.status(404).json({ success: false, message: 'Admin không tồn tại' });
            return;
        }

        // Check if reset code was already verified (activationCode should be null)
        if (admin.activationCode !== null) {
            res.status(400).json({ success: false, message: 'Vui lòng xác thực mã đặt lại trước khi tiếp tục' });
            return;
        }

        // Update password
        admin.password = newPassword;
        await admin.save();

        res.status(200).json({
            success: true,
            message: 'Cập nhật mật khẩu thành công. Bạn có thể đăng nhập với mật khẩu mới.'
        });

    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const createManager = catchAsync(async (req: Request & { admin?: any }, res: Response, next: NextFunction) => {
    const { fullName, email, phoneNumber, dateOfBirth, citizenCode, address, clubId } = req.body;

    const adminId = req.admin?.adminId;
    if (!adminId) {
        return next(new ErrorHandler('Lỗi xác thực: Không tìm thấy Admin ID trong token.', 401));
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
        return next(new ErrorHandler('Lỗi xác thực: Không tìm thấy Admin ID trong token.', 401));
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
        return next(new ErrorHandler('Lỗi xác thực: Không tìm thấy Admin ID trong token.', 401));
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
        return next(new ErrorHandler('Lỗi xác thực: Không tìm thấy Admin ID trong token.', 401));
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
    const { brandId } = req.query;
    const managers = await AdminService.getAllManagersByAdmin(brandId as string | undefined);
    res.status(200).json({
        success: true,
        data: managers,
    });
});

export const getManagerDetail = catchAsync(async (req: Request & { admin?: any }, res: Response, next: NextFunction) => {
    const { managerId } = req.params;
    if (!managerId) {
        return next(new ErrorHandler('Manager ID là bắt buộc.', 400));
    }
    const manager = await AdminService.getManagerDetailByAdmin(managerId);
    res.status(200).json({
        success: true,
        data: manager,
    });
});

// Resend verification code (cho đăng ký)
export const resendVerificationCode = async (req: Request, res: Response): Promise<void> => {
    try {
        // Kiểm tra req.body có tồn tại không
        if (!req.body) {
            res.status(400).json({ success: false, message: 'Request body là bắt buộc' });
            return;
        }

        const { email } = req.body;

        if (!email) {
            res.status(400).json({ success: false, message: 'Email là bắt buộc' });
            return;
        }

        const admin = await Admin.findOne({ email });
        if (!admin) {
            res.status(404).json({ success: false, message: 'Admin không tồn tại' });
            return;
        }

        // Kiểm tra xem tài khoản đã được verify chưa
        if (admin.isVerified) {
            res.status(400).json({ success: false, message: 'Tài khoản đã được xác thực' });
            return;
        }

        // Tạo mã xác thực mới
        const activationCode = generateRandomCode(6);
        const activationCodeExpires = new Date(Date.now() + 10 * 60 * 1000);

        // Cập nhật mã xác thực mới
        admin.activationCode = activationCode;
        admin.activationCodeExpires = activationCodeExpires;
        await admin.save({ validateBeforeSave: false });

        // Gửi email với mã mới
        await sendMail({
            email: admin.email,
            subject: 'ScoreLens - Mã Xác Thực Đăng Nhập',
            template: 'activation-mail.ejs',
            data: {
                user: { name: admin.fullName },
                activationCode
            }
        });

        res.status(200).json({
            success: true,
            message: 'Mã xác thực đã được gửi đến email của bạn. Mã này sẽ hết hạn trong 10 phút.',
            data: { email: admin.email }
        });

    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ' });
    }
};

// Resend reset password code
export const resendResetPasswordCode = async (req: Request, res: Response): Promise<void> => {
    try {
        // Kiểm tra req.body có tồn tại không
        if (!req.body) {
            res.status(400).json({ success: false, message: 'Request body là bắt buộc' });
            return;
        }

        const { email } = req.body;

        if (!email) {
            res.status(400).json({ success: false, message: 'Email là bắt buộc' });
            return;
        }

        const admin = await Admin.findOne({ email });
        if (!admin) {
            res.status(404).json({ success: false, message: 'Admin không tồn tại' });
            return;
        }

        // Kiểm tra xem tài khoản đã được verify chưa
        if (!admin.isVerified) {
            res.status(403).json({ success: false, message: 'Tài khoản chưa được xác thực. Vui lòng xác thực tài khoản trước.' });
            return;
        }

        // Tạo mã reset password mới
        const resetCode = generateRandomCode(6);
        const resetCodeExpires = new Date(Date.now() + 10 * 60 * 1000);

        // Cập nhật mã reset mới
        admin.activationCode = resetCode;
        admin.activationCodeExpires = resetCodeExpires;
        await admin.save({ validateBeforeSave: false });

        // Gửi email với mã mới
        await sendMail({
            email: admin.email,
            subject: 'ScoreLens - Mã Đặt Lại Mật Khẩu',
            template: 'activation-mail.ejs',
            data: {
                user: { name: admin.fullName },
                activationCode: resetCode
            }
        });

        res.status(200).json({
            success: true,
            message: 'Mã đặt lại mật khẩu đã được gửi đến email của bạn. Mã này sẽ hết hạn trong 10 phút.',
            data: { email: admin.email }
        });

    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ' });
    }
};

export const setStatusPendingSelf = async (req: Request & { admin?: any }, res: Response): Promise<void> => {
    try {
        const adminId = req.admin?.adminId;
        if (!adminId) {
            res.status(401).json({ success: false, message: 'Không được phép truy cập' });
            return;
        }
        const admin = await Admin.findOneAndUpdate(
            { adminId },
            { status: 'pending', rejectedReason: null },
            { new: true }
        );
        if (!admin) {
            res.status(404).json({ success: false, message: 'Admin không tồn tại.' });
            return;
        }
        res.json({ success: true, admin });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Delete admin account and all related data
export const deleteAdminAccount = catchAsync(async (req: Request & { admin?: any }, res: Response, next: NextFunction) => {
    const adminId = req.admin?.adminId;
    if (!adminId) {
        return next(new ErrorHandler('Lỗi xác thực: Không tìm thấy Admin ID trong token.', 401));
    }

    const admin = await Admin.findOne({ adminId });
    if (!admin) {
        return next(new ErrorHandler('Admin không tồn tại.', 404));
    }

    const brandId = admin.brandId;
    if (!brandId) {
        return next(new ErrorHandler('Admin chưa có brand được gán.', 400));
    }

    const session = await Admin.db.startSession();
    session.startTransaction();

    try {
        const brand = await Brand.findOne({ brandId }).session(session);
        if (!brand) {
            throw new Error('Brand không tồn tại.');
        }

        const clubIds = brand.clubIds || [];

        const managersCount = await Manager.countDocuments({ brandId }).session(session);
        const membershipsCount = await Membership.countDocuments({ brandId }).session(session);
        const feedbacksCount = await Feedback.countDocuments({ clubId: { $in: clubIds } }).session(session);

        const tables = await Table.find({ clubId: { $in: clubIds } }).session(session);
        const tableIds = tables.map(table => table.tableId);

        const camerasCount = await Camera.countDocuments({ tableId: { $in: tableIds } }).session(session);
        const matchesCount = await Match.countDocuments({ tableId: { $in: tableIds } }).session(session);

        await Feedback.deleteMany({ clubId: { $in: clubIds } }).session(session);

        await Match.deleteMany({ tableId: { $in: tableIds } }).session(session);

        await Camera.deleteMany({ tableId: { $in: tableIds } }).session(session);

        await Table.deleteMany({ clubId: { $in: clubIds } }).session(session);

        await Manager.deleteMany({ brandId }).session(session);

        await Membership.deleteMany({ brandId }).session(session);

        await Club.deleteMany({ brandId }).session(session);

        await Brand.deleteOne({ brandId }).session(session);

        await Admin.deleteOne({ adminId }).session(session);

        await session.commitTransaction();

        res.status(200).json({
            success: true,
            message: 'Tài khoản Admin và tất cả dữ liệu liên quan đã được xóa thành công.',
            deletedData: {
                admin: 1,
                brand: 1,
                clubs: clubIds.length,
                managers: managersCount,
                memberships: membershipsCount,
                tables: tableIds.length,
                cameras: camerasCount,
                matches: matchesCount,
                feedbacks: feedbacksCount
            }
        });

    } catch (error: any) {
        await session.abortTransaction();
        return next(new ErrorHandler(`Lỗi khi xóa tài khoản admin: ${error.message}`, 500));
    } finally {
        session.endSession();
    }
});

// SendRegisterSuccessMail
export const sendRegisterSuccessMail = async (req: Request & { admin?: any }, res: Response): Promise<void> => {
    try {
        const adminId = req.admin.adminId;
        const admin = await Admin.findOne({ adminId });
        
        if (!admin) {
            res.status(404).json({ success: false, message: 'Admin không tồn tại.' });
            return;
        }

        const template = 'register-success.ejs';
        const subject = 'ScoreLens - Đơn đăng ký thành công.';
        
        await sendMail({
            email: admin.email,
            subject,
            template,
            data: { user: { name: admin.fullName } }
        });

        res.status(200).json({ 
            success: true, 
            message: 'Email thông báo đăng ký thành công đã được gửi.' 
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};
