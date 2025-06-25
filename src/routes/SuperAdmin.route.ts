import express from 'express';
import {
  registerSuperAdmin,
  verifySuperAdmin,
  loginSuperAdmin,
  verifyLogin,
  logoutSuperAdmin,
  getProfile
} from '../controllers/SuperAdmin.controller';
import { authenticateSuperAdmin } from '../middlewares/auth/auth.middleware';

const router = express.Router();

// Public routes
router.post('/register', registerSuperAdmin);
router.post('/verify', verifySuperAdmin);
router.post('/login', loginSuperAdmin);
router.post('/login/verify', verifyLogin);

// Protected routes (require authentication)
router.post('/logout', authenticateSuperAdmin, logoutSuperAdmin);
router.get('/profile', authenticateSuperAdmin, getProfile);

export default router;