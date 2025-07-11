import express from 'express';
import { loginManager, verifyLogin, getProfile, logoutManager, resendLoginCode } from '../controllers/Manager.controller';
import { listTables, createTable, updateTable, deleteTable } from '../controllers/Table.controller';
import { isAuthenticated } from '../middlewares/auth/auth.middleware';
import { createMembership, listMemberships, updateMembership, deleteMembership } from '../controllers/Membership.controller';

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

export default managerRouter;