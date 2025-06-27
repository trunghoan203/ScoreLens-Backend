import { Request, Response } from 'express';
import { Admin } from '../models/Admin.model';
import { sendToken } from '../utils/jwt';
import { generateRandomCode } from '../utils/helpers';
import sendMail from '../utils/sendMail';

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
    const activationCodeExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

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

    } catch (error:any) {
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
        const admin = await Admin.findOne({adminId: adminId});

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