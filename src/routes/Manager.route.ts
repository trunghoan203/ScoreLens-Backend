import express from 'express';
import { loginManager, verifyLogin, getProfile, logoutManager, resendLoginCode } from '../controllers/Manager.controller';
import { listTables, createTable, updateTable, deleteTable } from '../controllers/Table.controller';
import { createMembership, listMemberships, updateMembership, deleteMembership } from '../controllers/Membership.controller';
import { listCameras, createCamera, updateCamera, deleteCamera } from '../controllers/Camera.controller';
import { getFeedbacks, getFeedbackDetail, updateFeedback } from '../controllers/Feedback.controller';
import { isAuthenticated } from '../middlewares/auth/auth.middleware';

const managerRouter = express.Router();

managerRouter.post('/login', loginManager);
managerRouter.post('/login/verify', verifyLogin);
managerRouter.post('/resend-login-code', resendLoginCode);

// Protected routes (require authentication)
managerRouter.post('/logout', isAuthenticated, logoutManager);
managerRouter.get('/profile', isAuthenticated, getProfile);

// Table management routes for manager
managerRouter.get('/table', isAuthenticated, listTables);
managerRouter.post('/table', isAuthenticated, createTable);
managerRouter.put('/table/:tableId', isAuthenticated, updateTable);
managerRouter.delete('/table/:tableId', isAuthenticated, deleteTable);

// Membership management routes for manager
managerRouter.get('/membership', isAuthenticated, listMemberships);
managerRouter.post('/membership', isAuthenticated, createMembership);
managerRouter.put('/membership/:membershipId', isAuthenticated, updateMembership);
managerRouter.delete('/membership/:membershipId', isAuthenticated, deleteMembership);

// Camera management routes for manager
managerRouter.get('/camera', isAuthenticated, listCameras);
managerRouter.post('/camera', isAuthenticated, createCamera);
managerRouter.put('/camera/:cameraId', isAuthenticated, updateCamera);
managerRouter.delete('/camera/:cameraId', isAuthenticated, deleteCamera);

// Feedback management routes for manager
managerRouter.get('/feedback', isAuthenticated, getFeedbacks);
managerRouter.get('/feedback/:feedbackId', isAuthenticated, getFeedbackDetail);
managerRouter.put('/feedback/:feedbackId', isAuthenticated, updateFeedback);

export default managerRouter;