import { Request, Response } from 'express';
import { Manager } from '../models/Manager.model';
import { Club } from '../models/Club.model';
import { sendToken } from '../utils/jwt';
import { generateRandomCode } from '../utils/helpers';
import sendMail from '../utils/sendMail';
import jwt from 'jsonwebtoken'

export const loginManager = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    const manager = await Manager.findOne({ email });
    if (!manager) {
      res.status(404).json({ success: false, message: 'Manager không tồn tại' });
      return;
    }

    const activationCode = generateRandomCode(6);
    const activationCodeExpires = new Date(Date.now() + 10 * 60 * 1000);

    manager.activationCode = activationCode;
    manager.activationCodeExpires = activationCodeExpires;
    await manager.save();

    await sendMail({
      email: manager.email,
      subject: 'ScoreLens - Mã Xác Thực Đăng Nhập',
      template: 'activation-mail.ejs',
      data: {
        user: { name: manager.fullName },
        activationCode
      }
    });

    res.status(200).json({
      success: true,
      message: 'Mã xác thực đã được gửi đến email của bạn. Mã này sẽ hết hạn trong 10 phút.',
      data: { email: manager.email }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ' });
  }
};

export const verifyLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, activationCode } = req.body;

    const manager = await Manager.findOne({ email });
    if (!manager) {
      res.status(404).json({ success: false, message: 'Manager không tồn tại' });
      return;
    }

    if (manager.activationCode !== activationCode) {
      res.status(400).json({ success: false, message: 'Mã xác thực không hợp lệ' });
      return;
    }

    if (manager.activationCodeExpires && new Date() > manager.activationCodeExpires) {
      res.status(400).json({ success: false, message: 'Mã xác thực đã hết hạn' });
      return;
    }

    manager.activationCode = null;
    manager.activationCodeExpires = null;
    await manager.save();

    sendToken(manager, 200, res);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ' });
  }
};

export const logoutManager = async (req: Request, res: Response): Promise<void> => {
  try {
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
    res.status(200).json({ success: true, message: 'Đăng xuất thành công' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ' });
  }
};

export const refreshAccessToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const refresh_token = req.cookies.refresh_token;

    if (!refresh_token) {
      res.status(401).json({ success: false, message: 'Không có refresh token được cung cấp' });
      return;
    }

    const decoded = jwt.verify(refresh_token, process.env.REFRESH_TOKEN as string) as { managerId: string };

    const manager = await Manager.findOne({ sAdminId: decoded.managerId });
    if (!manager) {
      res.status(401).json({ success: false, message: 'Refresh token không hợp lệ' });
      return;
    }

    sendToken(manager, 200, res);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ' });
  }
};

export const getProfile = async (req: Request & { manager?: any }, res: Response): Promise<void> => {
  try {
    const manager = req.manager;

    if (!manager) {
      res.status(401).json({
        success: false,
        message: 'Không được xác thực'
      });
      return;
    }

    let clubName = 'Club không xác định';
    if (manager.clubId) {
      const clubId = manager.clubId.replace(',', '');
      try {
        const club = await Club.findOne({ clubId: clubId });
        if (club) {
          clubName = club.clubName;
        }
      } catch (clubError) {
      }
    }

    res.status(200).json({
      success: true,
      manager: {
        managerId: manager.managerId,
        fullName: manager.fullName,
        email: manager.email,
        phoneNumber: manager.phoneNumber,
        dateOfBirth: manager.dateOfBirth,
        citizenCode: manager.citizenCode,
        address: manager.address,
        clubId: manager.clubId,
        clubName: clubName,
        isActive: manager.isActive,
        lastLogin: manager.lastLogin || null
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ' });
  }
};

// Resend login verification code
export const resendLoginCode = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.body) {
      res.status(400).json({ success: false, message: 'Request body là bắt buộc' });
      return;
    }

    const { email } = req.body;

    if (!email) {
      res.status(400).json({ success: false, message: 'Email là bắt buộc' });
      return;
    }

    const manager = await Manager.findOne({ email });
    if (!manager) {
      res.status(404).json({ success: false, message: 'Manager không tồn tại' });
      return;
    }

    if (!manager.isActive) {
      res.status(403).json({ success: false, message: 'Tài khoản Manager đã bị vô hiệu hóa' });
      return;
    }

    const activationCode = generateRandomCode(6);
    const activationCodeExpires = new Date(Date.now() + 10 * 60 * 1000);

    manager.activationCode = activationCode;
    manager.activationCodeExpires = activationCodeExpires;
    await manager.save();

    await sendMail({
      email: manager.email,
      subject: 'ScoreLens - Mã Xác Thực Đăng Nhập Mới',
      template: 'activation-mail.ejs',
      data: {
        user: { name: manager.fullName },
        activationCode
      }
    });

    res.status(200).json({
      success: true,
      message: 'Mã xác thực đã được gửi đến email của bạn. Mã này sẽ hết hạn trong 10 phút.',
      data: { email: manager.email }
    });

  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ' });
  }
};
