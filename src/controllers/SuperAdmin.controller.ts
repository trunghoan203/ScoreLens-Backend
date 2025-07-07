import { Request, Response } from 'express';
import { SuperAdmin } from '../models/SuperAdmin.model';
import { Admin } from '../models/Admin.model';
import { sendToken } from '../utils/jwt';
import { generateRandomCode } from '../utils/helpers';
import sendMail from '../utils/sendMail';
import jwt from 'jsonwebtoken'

//Authentication APIs
export const registerSuperAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fullName, email } = req.body;

    const existingAdmin = await SuperAdmin.findOne({ email });
    if (existingAdmin) {
      res.status(400).json({ success: false, message: 'Email already registered' });
      return;
    }

    const sAdminId = `SA-${Date.now()}`;
    const activationCode = generateRandomCode(6);
    const activationCodeExpires = new Date(Date.now() + 5 * 60 * 1000);

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
      message: 'Activation code sent to email',
      data: { email: newAdmin.email }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const verifySuperAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, activationCode } = req.body;

    const admin = await SuperAdmin.findOne({ email });
    if (!admin) {
      res.status(404).json({ success: false, message: 'Super Admin not found' });
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

    // sendAdminToken(admin, 200, res);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const loginSuperAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    const admin = await SuperAdmin.findOne({ email });
    if (!admin) {
      res.status(404).json({ success: false, message: 'Super Admin not found' });
      return;
    }

    if (!admin.isVerified) {
      res.status(403).json({ success: false, message: 'Account not verified' });
      return;
    }

    const activationCode = generateRandomCode(6);
    const activationCodeExpires = new Date(Date.now() + 5 * 60 * 1000);

    admin.activationCode = activationCode;
    admin.activationCodeExpires = activationCodeExpires;
    await admin.save();

    await sendMail({
      email: admin.email,
      subject: 'ScoreLens - Login Verification',
      template: 'activation-mail.ejs',
      data: {
        user: { name: admin.fullName },
        activationCode
      }
    });

    res.status(200).json({
      success: true,
      message: 'Login verification code sent to email',
      data: { email: admin.email }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const verifyLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, activationCode } = req.body;

    const admin = await SuperAdmin.findOne({ email });
    if (!admin) {
      res.status(404).json({ success: false, message: 'Super Admin not found' });
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

    admin.activationCode = null;
    admin.activationCodeExpires = null;
    admin.lastLogin = new Date();
    await admin.save();

    sendToken(admin, 200, res);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const logoutSuperAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
    res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const refreshAccessToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const refresh_token = req.cookies.refresh_token;

    if (!refresh_token) {
      res.status(401).json({ success: false, message: 'No refresh token provided' });
      return;
    }

    const decoded = jwt.verify(refresh_token, process.env.REFRESH_TOKEN as string) as { sAdminId: string };

    const admin = await SuperAdmin.findOne({ sAdminId: decoded.sAdminId });
    if (!admin) {
      res.status(401).json({ success: false, message: 'Invalid refresh token' });
      return;
    }

    sendToken(admin, 200, res);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getProfile = async (req: Request & { superAdmin?: any }, res: Response): Promise<void> => {
  try {
    const superAdmin = req.superAdmin; // Giờ sẽ không báo lỗi

    if (!superAdmin) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated'
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
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

//Manage Admin APIs
// Approve admin
export const approveAdmin = async (req: Request, res: Response): Promise<void> => {
  const { adminId } = req.params;
  const admin = await Admin.findOneAndUpdate(
    { adminId },
    { status: 'approved' },
    { new: true }
  );
  if (!admin) {
    res.status(404).json({ success: false, message: 'Admin not found' });
    return;
  }
  res.json({ success: true, admin });
};

// Reject admin
export const rejectAdmin = async (req: Request, res: Response): Promise<void> => {
  const { adminId } = req.params;
  const admin = await Admin.findOneAndUpdate(
    { adminId },
    { status: 'rejected' },
    { new: true }
  );
  if (!admin) {
    res.status(404).json({ success: false, message: 'Admin not found' });
    return;
  }
  res.json({ success: true, admin });
};

// List admins with filter/search
export const listAdmins = async (req: Request, res: Response): Promise<void> => {
  const { search = '', status, page = 1, limit = 10 } = req.query;
  const query: any = {};
  if (status) query.status = status;
  if (search) query.fullName = { $regex: search, $options: 'i' };
  const admins = await Admin.find(query)
    .skip((Number(page) - 1) * Number(limit))
    .limit(Number(limit));
  res.json({ success: true, admins });
};

// Admin detail
export const getAdminDetail = async (req: Request, res: Response): Promise<void> => {
  const { adminId } = req.params;
  const admin = await Admin.findOne({ adminId });
  if (!admin) {
    res.status(404).json({ success: false, message: 'Admin not found' });
    return;
  }
  res.json({ success: true, admin });
};