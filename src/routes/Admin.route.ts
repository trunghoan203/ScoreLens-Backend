import express from 'express';
import { registerAdmin, verifyAdmin, loginAdmin, logoutAdmin, refreshToken, getAdminProfile, forgotPassword, verifyResetCode, setNewPassword, createManager, updateManager, deleteManager, deactivateManager, getAllManagers, resendVerificationCode, resendResetPasswordCode, getManagerDetail, setStatusPendingSelf, deleteAdminAccount, sendRegisterSuccessMail } from '../controllers/Admin.controller';
import { createBrand, updateBrand, getBrands, getBrandDetail, deleteBrand } from '../controllers/Brand.controller';
import { createClub, updateClub, deleteClub, getClubs, getClubDetail } from '../controllers/Club.controller';
import { getFeedbacks, getFeedbackDetail, updateFeedback } from '../controllers/Feedback.controller';
import { isAuthenticated } from '../middlewares/auth/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  adminRegisterSchema,
  adminLoginSchema,
  createBrandSchema,
  updateBrandSchema,
  createClubSchema,
  updateClubSchema,
  createManagerSchema,
  updateManagerSchema,
  emailSchema,
  updateFeedbackSchema
} from '../validations';
import upload from '../middlewares/upload.middleware';
import { Request, Response } from 'express';
import { MESSAGES } from '../config/messages';

const adminRouter = express.Router();

adminRouter.post('/register', validate(adminRegisterSchema), registerAdmin);
adminRouter.post('/verify', verifyAdmin);
adminRouter.post('/login', validate(adminLoginSchema), loginAdmin);
adminRouter.post('/refresh-token', refreshToken);
adminRouter.post('/forgotPassword', validate(emailSchema), forgotPassword);
adminRouter.post('/verify-resetCode', verifyResetCode);
adminRouter.post('/set-newPassword', setNewPassword);
adminRouter.post('/resend-verification', resendVerificationCode);
adminRouter.post('/resend-reset-password', resendResetPasswordCode);
adminRouter.post('/logout', isAuthenticated, logoutAdmin);
adminRouter.get('/profile', isAuthenticated, getAdminProfile);
adminRouter.post('/upload-image', upload.single('image'), (req: Request, res: Response): void => {
  if (!req.file) {
    res.status(400).json({ success: false, message: MESSAGES.MSG99 });
    return;
  }
  const backendUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
  const fileUrl = `${backendUrl}/static/uploads/${req.file.filename}`;
  res.json({ success: true, url: fileUrl });
});
adminRouter.patch('/status/pending', isAuthenticated, setStatusPendingSelf);

// Delete admin account and all related data
adminRouter.delete('/delete-account', isAuthenticated, deleteAdminAccount);

adminRouter.post('/sendmail', isAuthenticated, sendRegisterSuccessMail);

//Manager Management
adminRouter.get('/managers', isAuthenticated, getAllManagers);
adminRouter.post('/managers', isAuthenticated,validate(createManagerSchema), createManager);
adminRouter.put('/managers/:managerId', isAuthenticated, validate(updateManagerSchema), updateManager);
adminRouter.patch('/managers/:managerId/deactivate', isAuthenticated, deactivateManager);
adminRouter.delete('/managers/:managerId', isAuthenticated, deleteManager);
adminRouter.get('/managers/:managerId', isAuthenticated, getManagerDetail);

//Brand Management
adminRouter.post('/brands', isAuthenticated, validate(createBrandSchema),createBrand);

adminRouter.put('/brands/:brandId', isAuthenticated,validate(updateBrandSchema),updateBrand);
adminRouter.get('/brands', isAuthenticated, getBrands);
adminRouter.get('/brands/:brandId', isAuthenticated, getBrandDetail);
adminRouter.delete('/brands/:brandId', isAuthenticated, deleteBrand);

//Club Management
adminRouter.post('/clubs', isAuthenticated, validate(createClubSchema), createClub);
adminRouter.put('/clubs/:clubId',isAuthenticated,validate(updateClubSchema),updateClub);
adminRouter.delete('/clubs/:clubId', isAuthenticated, deleteClub);
adminRouter.get('/clubs', isAuthenticated, getClubs);
adminRouter.get('/clubs/:clubId', isAuthenticated, getClubDetail);

//Feedback Management
adminRouter.get('/feedback', isAuthenticated, getFeedbacks);
adminRouter.get('/feedback/:feedbackId', isAuthenticated, getFeedbackDetail);
adminRouter.put('/feedback/:feedbackId', isAuthenticated, validate(updateFeedbackSchema), updateFeedback);

export default adminRouter; 