import express from 'express';
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
import { isAuthenticated } from '../middlewares/auth/auth.middleware';

const superAdminRouter = express.Router();

// Public routes
superAdminRouter.post('/register', registerSuperAdmin);
superAdminRouter.post('/verify', verifySuperAdmin);
superAdminRouter.post('/login', loginSuperAdmin);
superAdminRouter.post('/login/verify', verifyLogin);
superAdminRouter.post('/resend-verification', resendVerificationCode);
superAdminRouter.post('/resend-login-code', resendLoginCode);

// Protected routes (require authentication)
superAdminRouter.post('/logout', isAuthenticated, logoutSuperAdmin);
superAdminRouter.get('/profile', isAuthenticated, getProfile);

// Admin management routes
superAdminRouter.post('/admin/approve/:adminId', isAuthenticated, approveAdmin);
superAdminRouter.post('/admin/reject/:adminId', isAuthenticated, rejectAdmin);
superAdminRouter.get('/admin/list', isAuthenticated, listAdmins);
superAdminRouter.get('/admin/:adminId', isAuthenticated, getAdminDetail);

export default superAdminRouter;