import { Router } from 'express';
import { loginManager, verifyLogin, getProfile, logoutManager } from '../controllers/Manager.controller';
import { listTables, createTable, updateTable, deleteTable } from '../controllers/Table.controller';
import { isAuthenticated } from '../middlewares/auth/auth.middleware';

const managerRouter = Router();

managerRouter.post('/login', loginManager);
managerRouter.post('/login/verify', verifyLogin);

// Protected routes (require authentication)
managerRouter.post('/logout', isAuthenticated, logoutManager);
managerRouter.get('/profile', isAuthenticated, getProfile);

// Table management routes for manager
managerRouter.get('/table', isAuthenticated, listTables);
managerRouter.post('/table', isAuthenticated, createTable);
managerRouter.put('/table/:id', isAuthenticated, updateTable);
managerRouter.delete('/table/:id', isAuthenticated, deleteTable);

export default managerRouter;