import { Request, Response } from 'express';
import { SuperAdmin } from '../models/SuperAdmin.model';
import { Admin } from '../models/Admin.model';
import { Brand } from '../models/Brand.model';
import { Club } from '../models/Club.model';
import { sendToken } from '../utils/jwt';
import { generateRandomCode } from '../utils/helpers';
import sendMail from '../utils/sendMail';
import jwt from 'jsonwebtoken'
import { MESSAGES } from '../config/messages';

//Authentication APIs
export const registerSuperAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fullName, email } = req.body;

    const existingAdmin = await SuperAdmin.findOne({ email });
    if (existingAdmin) {
      res.status(400).json({ success: false, message: MESSAGES.MSG06 });
      return;
    }

    const sAdminId = `SA-${Date.now()}`;
    const activationCode = generateRandomCode(6);
    const activationCodeExpires = new Date(Date.now() + 10 * 60 * 1000);

    const newAdmin = await SuperAdmin.create({
      sAdminId,
      fullName,
      email,
      activationCode,
      activationCodeExpires
    });

    await sendMail({
      email: newAdmin.email,
      subject: 'ScoreLens - Xác Thực Email',
      template: 'activation-mail.ejs',
      data: {
        user: { name: newAdmin.fullName },
        activationCode
      }
    });

    res.status(201).json({
      success: true,
      message: MESSAGES.MSG123,
      data: { email: newAdmin.email }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: MESSAGES.MSG100 });
  }
};

export const verifySuperAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, activationCode } = req.body;

    const admin = await SuperAdmin.findOne({ email });
    if (!admin) {
      res.status(404).json({ success: false, message: MESSAGES.MSG30 });
      return;
    }

    if (admin.isVerified) {
      res.status(400).json({ success: false, message: MESSAGES.MSG18 });
      return;
    }

    if (admin.activationCode !== activationCode) {
      res.status(400).json({ success: false, message: MESSAGES.MSG23 });
      return;
    }

    if (admin.activationCodeExpires && new Date() > admin.activationCodeExpires) {
      res.status(400).json({ success: false, message: MESSAGES.MSG24 });
      return;
    }

    admin.isVerified = true;
    admin.activationCode = null;
    admin.activationCodeExpires = null;
    await admin.save();

  } catch (error) {
    res.status(500).json({ success: false, message: MESSAGES.MSG100 });
  }
};

export const loginSuperAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    const admin = await SuperAdmin.findOne({ email });
    if (!admin) {
      res.status(404).json({ success: false, message: MESSAGES.MSG30 });
      return;
    }

    if (!admin.isVerified) {
      res.status(403).json({ success: false, message: 'Tài khoản chưa được xác thực' });
      return;
    }

    const activationCode = generateRandomCode(6);
    const activationCodeExpires = new Date(Date.now() + 10 * 60 * 1000);

    admin.activationCode = activationCode;
    admin.activationCodeExpires = activationCodeExpires;
    await admin.save();

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
      message: MESSAGES.MSG123,
      data: { email: admin.email }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: MESSAGES.MSG100 });
  }
};

export const verifyLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, activationCode } = req.body;

    const admin = await SuperAdmin.findOne({ email });
    if (!admin) {
      res.status(404).json({ success: false, message: MESSAGES.MSG30 });
      return;
    }

    if (admin.activationCode !== activationCode) {
      res.status(400).json({ success: false, message: MESSAGES.MSG23 });
      return;
    }

    if (admin.activationCodeExpires && new Date() > admin.activationCodeExpires) {
      res.status(400).json({ success: false, message: MESSAGES.MSG24 });
      return;
    }

    admin.activationCode = null;
    admin.activationCodeExpires = null;
    admin.lastLogin = new Date();
    await admin.save();

    sendToken(admin, 200, res);
  } catch (error) {
    res.status(500).json({ success: false, message: MESSAGES.MSG100 });
  }
};

export const logoutSuperAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      const { RememberPasswordService } = await import('../services/RememberPassword.service');
      await RememberPasswordService.revokeRefreshToken(refreshToken);
    }

    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
    res.status(200).json({ success: true, message: MESSAGES.MSG02 });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const refreshAccessToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const refresh_token = req.cookies.refresh_token;

    if (!refresh_token) {
      res.status(401).json({ success: false, message: MESSAGES.MSG10 });
      return;
    }

    const decoded = jwt.verify(refresh_token, process.env.REFRESH_TOKEN as string) as { sAdminId: string };

    const admin = await SuperAdmin.findOne({ sAdminId: decoded.sAdminId });
    if (!admin) {
      res.status(401).json({ success: false, message: MESSAGES.MSG11 });
      return;
    }

    sendToken(admin, 200, res);
  } catch (error) {
    res.status(500).json({ success: false, message: MESSAGES.MSG100 });
  }
};

export const getProfile = async (req: Request & { superAdmin?: any }, res: Response): Promise<void> => {
  try {
    const superAdmin = req.superAdmin;

    if (!superAdmin) {
      res.status(401).json({
        success: false,
        message: 'Không được xác thực'
      });
      return;
    }

    res.status(200).json({
      success: true,
      admin: {
        sAdminId: superAdmin.sAdminId,
        fullName: superAdmin.fullName,
        email: superAdmin.email,
        isVerified: superAdmin.isVerified,
        lastLogin: superAdmin.lastLogin
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: MESSAGES.MSG100 });
  }
};

// Resend verification code
export const resendVerificationCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ success: false, message: MESSAGES.MSG121 });
      return;
    }

    const superAdmin = await SuperAdmin.findOne({ email });
    if (!superAdmin) {
      res.status(404).json({ success: false, message: MESSAGES.MSG30 });
      return;
    }

    // Kiểm tra xem tài khoản đã được verify chưa
    if (superAdmin.isVerified) {
      res.status(400).json({ success: false, message: MESSAGES.MSG18 });
      return;
    }

    // Tạo mã xác thực mới
    const activationCode = generateRandomCode(6);
    const activationCodeExpires = new Date(Date.now() + 10 * 60 * 1000);

    // Cập nhật mã xác thực mới
    superAdmin.activationCode = activationCode;
    superAdmin.activationCodeExpires = activationCodeExpires;
    await superAdmin.save();

    // Gửi email với mã mới
    await sendMail({
      email: superAdmin.email,
      subject: 'ScoreLens - Mã Xác Thực Mới',
      template: 'activation-mail.ejs',
      data: {
        user: { name: superAdmin.fullName },
        activationCode
      }
    });

    res.status(200).json({
      success: true,
      message: MESSAGES.MSG123,
      data: { email: superAdmin.email }
    });

  } catch (error: any) {
    console.error('Resend verification code error:', error);
    res.status(500).json({ success: false, message: MESSAGES.MSG100 });
  }
};

// Resend login verification code
export const resendLoginCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ success: false, message: MESSAGES.MSG121 });
      return;
    }

    const superAdmin = await SuperAdmin.findOne({ email });
    if (!superAdmin) {
      res.status(404).json({ success: false, message: MESSAGES.MSG30 });
      return;
    }

    // Kiểm tra xem tài khoản đã được verify chưa
    if (!superAdmin.isVerified) {
      res.status(403).json({ success: false, message: MESSAGES.MSG19 });
      return;
    }

    // Tạo mã xác thực đăng nhập mới
    const activationCode = generateRandomCode(6);
    const activationCodeExpires = new Date(Date.now() + 10 * 60 * 1000);

    // Cập nhật mã xác thực mới
    superAdmin.activationCode = activationCode;
    superAdmin.activationCodeExpires = activationCodeExpires;
    await superAdmin.save();

    // Gửi email với mã mới
    await sendMail({
      email: superAdmin.email,
      subject: 'ScoreLens - Mã Xác Thực Đăng Nhập Mới',
      template: 'activation-mail.ejs',
      data: {
        user: { name: superAdmin.fullName },
        activationCode
      }
    });

    res.status(200).json({
      success: true,
      message: MESSAGES.MSG123,
      data: { email: superAdmin.email }
    });

  } catch (error: any) {
    console.error('Resend login code error:', error);
    res.status(500).json({ success: false, message: MESSAGES.MSG100 });
  }
};

// Approve admin
export const approveAdmin = async (req: Request, res: Response): Promise<void> => {
  const { adminId } = req.params;
  const admin = await Admin.findOneAndUpdate(
    { adminId },
    { status: 'approved' },
    { new: true }
  );
  if (!admin) {
    res.status(404).json({ success: false, message: MESSAGES.MSG31 });
    return;
  }
  res.json({ success: true, admin });
  sendMail({
    email: admin.email,
    subject: 'ScoreLens - Tài khoản của bạn đã được duyệt.',
    template: 'approved-success.ejs',
    data: { user: { name: admin.fullName } }
  }).catch(() => {});
};

// Reject admin
export const rejectAdmin = async (req: Request, res: Response): Promise<void> => {
  const { adminId } = req.params;
  const { rejectedReason } = req.body;

  const admin = await Admin.findOneAndUpdate(
    { adminId },
    {
      status: 'rejected',
      rejectedReason: rejectedReason || null
    },
    { new: true }
  );
  if (!admin) {
    res.status(404).json({ success: false, message: MESSAGES.MSG31 });
    return;
  }
  res.json({ success: true, admin });
  const frontEndUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const reviewUrl = `${frontEndUrl}/admin/reform?adminId=${admin.adminId}`;
  sendMail({
    email: admin.email,
    subject: 'ScoreLens - Tài khoản của bạn đã bị từ chối.',
    template: 'rejected-success.ejs',
    data: { 
      user: { name: admin.fullName }, 
      rejectedReason: admin.rejectedReason,
      registerUrl: reviewUrl
    }
  }).catch(() => {});
};

// List admins with filter/search
export const listAdmins = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search = '', status, page = 1, limit = 10 } = req.query;
    const query: any = {};

    if (status) query.status = status;
    if (search) query.fullName = { $regex: search, $options: 'i' };

    const admins = await Admin.find(query)
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .lean();

    // Get brand and clubs for each admin
    const adminsWithDetails = await Promise.all(
      admins.map(async (admin) => {
        let brand: any = null;
        let clubs: any[] = [];

        if (admin.brandId) {
          brand = await Brand.findOne({ brandId: admin.brandId }).lean();
          clubs = await Club.find({ brandId: admin.brandId }).lean();
        }

        return {
          ...admin,
          brand,
          clubs
        };
      })
    );

    const total = await Admin.countDocuments(query);

    res.json({
      success: true,
      admins: adminsWithDetails,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: MESSAGES.MSG100 });
  }
};

// Admin detail
export const getAdminDetail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { adminId } = req.params;

    const admin = await Admin.findOne({ adminId }).lean();
    if (!admin) {
      res.status(404).json({ success: false, message: MESSAGES.MSG31 });
      return;
    }

    let brand: any = null;
    let clubs: any[] = [];

    if (admin.brandId) {
      brand = await Brand.findOne({ brandId: admin.brandId }).lean();
      clubs = await Club.find({ brandId: admin.brandId }).lean();
    }

    res.json({
      success: true,
      admin: {
        ...admin,
        brand,
        clubs
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: MESSAGES.MSG100 });
  }
};
