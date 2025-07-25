import express from 'express';
import { registerAdmin, verifyAdmin, loginAdmin, logoutAdmin, getAdminProfile, forgotPassword, verifyResetCode, setNewPassword, createManager, updateManager, deleteManager, deactivateManager, getAllManagers, resendVerificationCode, resendResetPasswordCode, getManagerDetail } from '../controllers/Admin.controller';
import { createBrand, updateBrand, getBrands, getBrandDetail, deleteBrand } from '../controllers/Brand.controller';
import { createClub, updateClub, deleteClub, getClubs, getClubDetail } from '../controllers/Club.controller';
import { getFeedbacks, getFeedbackDetail, updateFeedback } from '../controllers/Feedback.controller';
import { isAuthenticated } from '../middlewares/auth/auth.middleware';
import upload from '../middlewares/upload.middleware';
import { Request, Response } from 'express';

const adminRouter = express.Router();

adminRouter.post('/register', registerAdmin);
adminRouter.post('/verify', verifyAdmin);
adminRouter.post('/login', loginAdmin);
adminRouter.post('/forgotPassword', forgotPassword);
adminRouter.post('/verify-resetCode', verifyResetCode);
adminRouter.post('/set-newPassword', setNewPassword);
adminRouter.post('/resend-verification', resendVerificationCode);
adminRouter.post('/resend-reset-password', resendResetPasswordCode);
adminRouter.post('/logout', isAuthenticated, logoutAdmin);
adminRouter.get('/profile', isAuthenticated, getAdminProfile);
adminRouter.post('/upload-image', upload.single('image'), (req: Request, res: Response): void => {
  if (!req.file) {
    res.status(400).json({ success: false, message: 'Không có file được upload.' });
    return;
  }
  const protocol = req.protocol;
  const host = req.get('host');
  const fileUrl = `${protocol}://${host}/static/uploads/${req.file.filename}`;
  res.json({ success: true, url: fileUrl });
});

//Manager Management
adminRouter.get('/managers', isAuthenticated, getAllManagers);
adminRouter.post('/managers', isAuthenticated, createManager);
adminRouter.put('/managers/:managerId', isAuthenticated, updateManager);
adminRouter.patch('/managers/:managerId/deactivate', isAuthenticated, deactivateManager);
adminRouter.delete('/managers/:managerId', isAuthenticated, deleteManager);
adminRouter.get('/managers/:managerId', isAuthenticated, getManagerDetail);

//Brand Management
adminRouter.post('/brands', isAuthenticated, createBrand);
adminRouter.put('/brands/:brandId', isAuthenticated, updateBrand);
adminRouter.get('/brands', isAuthenticated, getBrands);
adminRouter.get('/brands/:brandId', isAuthenticated, getBrandDetail);
adminRouter.delete('/brands/:brandId', isAuthenticated, deleteBrand);

//Club Management
adminRouter.post('/clubs', isAuthenticated, createClub);
adminRouter.put('/clubs/:clubId', isAuthenticated, updateClub);
adminRouter.delete('/clubs/:clubId', isAuthenticated, deleteClub);
adminRouter.get('/clubs', isAuthenticated, getClubs);
adminRouter.get('/clubs/:clubId', isAuthenticated, getClubDetail);

//Feedback Management
adminRouter.get('/feedback', isAuthenticated, getFeedbacks);
adminRouter.get('/feedback/:feedbackId', isAuthenticated, getFeedbackDetail);
adminRouter.put('/feedback/:feedbackId', isAuthenticated, updateFeedback);

export default adminRouter; 