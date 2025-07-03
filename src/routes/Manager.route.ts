import { Router } from 'express';
import { loginManager, verifyLogin, getProfile, logoutManager } from '../controllers/Manager.controller';
import { isAuthenticated } from '../middlewares/auth/auth.middleware';

const managerRouter = Router();

managerRouter.post('/login', loginManager);
managerRouter.post('/login/verify', verifyLogin);

// Protected routes (require authentication)
managerRouter.post('/logout', isAuthenticated, logoutManager);
managerRouter.get('/profile', isAuthenticated, getProfile);

export default managerRouter;