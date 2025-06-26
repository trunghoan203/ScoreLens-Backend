import express from 'express';
import { registerAdmin, verifyAdmin, loginAdmin, logoutAdmin, getAdminProfile, verifyLogin } from '../controllers/Admin.controller';
import { isAuthenticated } from '../middlewares/auth/auth.middleware';

const adminRouter = express.Router();

adminRouter.post('/register', registerAdmin);
adminRouter.post('/verify', verifyAdmin);
adminRouter.post('/login', loginAdmin);
adminRouter.post('/login/verify', verifyLogin);

adminRouter.post('/logout', isAuthenticated, logoutAdmin);
adminRouter.get('/profile', isAuthenticated, getAdminProfile);

export default adminRouter; 