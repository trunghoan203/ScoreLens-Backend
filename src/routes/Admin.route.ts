import express from 'express';
import { registerAdmin, verifyAdmin, loginAdmin, logoutAdmin, getAdminProfile, forgotPassword, verifyResetCode, setNewPassword, createManager } from '../controllers/Admin.controller';
import { isAuthenticated } from '../middlewares/auth/auth.middleware';

const adminRouter = express.Router();

adminRouter.post('/register', registerAdmin);
adminRouter.post('/verify', verifyAdmin);
adminRouter.post('/login', loginAdmin);
adminRouter.post('/forgotPassword', forgotPassword);
adminRouter.post('/verify-resetCode', verifyResetCode);
adminRouter.post('/set-newPassword', setNewPassword);
adminRouter.post('/logout', isAuthenticated, logoutAdmin);
adminRouter.get('/profile', isAuthenticated, getAdminProfile);
adminRouter.post('/managers', isAuthenticated, createManager);

export default adminRouter; 