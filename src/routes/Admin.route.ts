import express from 'express';
import { registerAdmin, verifyAdmin, loginAdmin, logoutAdmin, getAdminProfile, forgotPassword, verifyResetCode, setNewPassword, createBrand, updateBrand, getBrands } from '../controllers/Admin.controller';
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
adminRouter.post('/brands', isAuthenticated, createBrand);
adminRouter.put('/brands/:brandId', isAuthenticated, updateBrand);
adminRouter.get('/brands', isAuthenticated, getBrands);

export default adminRouter; 