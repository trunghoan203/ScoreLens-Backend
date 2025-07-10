import express from 'express';
import { registerAdmin, verifyAdmin, loginAdmin, logoutAdmin, getAdminProfile, forgotPassword, verifyResetCode, setNewPassword, createManager } from '../controllers/Admin.controller';
import { createBrand, updateBrand, getBrands, getBrandDetail, deleteBrand } from '../controllers/Brand.controller';
import { isAuthenticated } from '../middlewares/auth/auth.middleware';
import { createClub, updateClub, deleteClub, getClubs, getClubDetail } from '../controllers/Club.controller';

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
adminRouter.post('/brands', isAuthenticated, createBrand);
adminRouter.put('/brands/:brandId', isAuthenticated, updateBrand);
adminRouter.get('/brands', isAuthenticated, getBrands);
adminRouter.get('/brands/:brandId', isAuthenticated, getBrandDetail);
adminRouter.delete('/brands/:brandId', isAuthenticated, deleteBrand);
adminRouter.post('/clubs', isAuthenticated, createClub);
adminRouter.put('/clubs/:clubId', isAuthenticated, updateClub);
adminRouter.delete('/clubs/:clubId', isAuthenticated, deleteClub);
adminRouter.get('/clubs', isAuthenticated, getClubs);
adminRouter.get('/clubs/:clubId', isAuthenticated, getClubDetail);

export default adminRouter; 