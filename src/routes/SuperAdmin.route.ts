import express from 'express';
import { z } from 'zod';
import {
  registerSuperAdmin,
  verifySuperAdmin,
  loginSuperAdmin,
  verifyLogin,
  logoutSuperAdmin,
  getProfile,
  approveAdmin,
  rejectAdmin,
  listAdmins,
  getAdminDetail,
  resendVerificationCode,
  resendLoginCode
} from '../controllers/SuperAdmin.controller';
import { getFeedbacks, getFeedbackDetail, updateFeedback } from '../controllers/Feedback.controller';
import { isAuthenticated } from '../middlewares/auth/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { loginSuperAdminSchema, emailSchema, updateFeedbackSchema } from '../validations';

const superAdminRouter = express.Router();
// Public routes
superAdminRouter.post('/register', registerSuperAdmin);
superAdminRouter.post('/verify', verifySuperAdmin);
superAdminRouter.post('/login', validate(loginSuperAdminSchema), loginSuperAdmin);
superAdminRouter.post('/login/verify', verifyLogin);
superAdminRouter.post('/resend-verification', validate(emailSchema), resendVerificationCode);
superAdminRouter.post('/resend-login-code', resendLoginCode);

// Protected routes (require authentication)
superAdminRouter.post('/logout', isAuthenticated, logoutSuperAdmin);
superAdminRouter.get('/profile', isAuthenticated, getProfile);

// Admin management routes
superAdminRouter.post('/admin/approve/:adminId', isAuthenticated, approveAdmin);
superAdminRouter.post('/admin/reject/:adminId', isAuthenticated, rejectAdmin);
superAdminRouter.get('/admin/list', isAuthenticated, listAdmins);
superAdminRouter.get('/admin/:adminId', isAuthenticated, getAdminDetail);

//Feedback management routes
superAdminRouter.get('/feedback', isAuthenticated, getFeedbacks);
superAdminRouter.get('/feedback/:feedbackId', isAuthenticated, getFeedbackDetail);
superAdminRouter.put('/feedback/:feedbackId', isAuthenticated, validate(updateFeedbackSchema), updateFeedback);

export default superAdminRouter;