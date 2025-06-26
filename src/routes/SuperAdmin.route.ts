import express from 'express';
import {
  registerSuperAdmin,
  verifySuperAdmin,
  loginSuperAdmin,
  verifyLogin,
  logoutSuperAdmin,
  getProfile
} from '../controllers/SuperAdmin.controller';
import { isAuthenticated } from '../middlewares/auth/auth.middleware';

const superAdminRouter = express.Router();

// Public routes
superAdminRouter.post('/register', registerSuperAdmin);
superAdminRouter.post('/verify', verifySuperAdmin);
superAdminRouter.post('/login', loginSuperAdmin);
superAdminRouter.post('/login/verify', verifyLogin);

// Protected routes (require authentication)
superAdminRouter.post('/logout', isAuthenticated, logoutSuperAdmin);
superAdminRouter.get('/profile', isAuthenticated, getProfile);

export default superAdminRouter;