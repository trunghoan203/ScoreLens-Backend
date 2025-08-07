import express from 'express';
import { loginManager, verifyLogin, getProfile, logoutManager, resendLoginCode } from '../controllers/Manager.controller';
import { listTables, createTable, updateTable, deleteTable, getTableById, getTablesByClub } from '../controllers/Table.controller';
import { createMembership, listMemberships, updateMembership, deleteMembership } from '../controllers/Membership.controller';
import { listCameras, createCamera, updateCamera, deleteCamera } from '../controllers/Camera.controller';
import { getFeedbacks, getFeedbackDetail, updateFeedback } from '../controllers/Feedback.controller';
import {
    createMatch,
    getMatchById,
    getMatchByCode,
    updateScore,
    updateTeamMembers,
    startMatch,
    endMatch,
    deleteMatch,
    getMatchesByTable,
    verifyTable,
    getMatchHistory,
} from '../controllers/Match.controller';
import { isAuthenticated } from '../middlewares/auth/auth.middleware';
import { findMatchById } from '../middlewares/utils/findMatchById.middleware';

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

// Public table routes (không cần xác thực)
managerRouter.post('/table/verify', verifyTable);
managerRouter.get('/table/:id', getTableById);
managerRouter.get('/table/club/:clubId', getTablesByClub);

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

// Match management routes for manager
managerRouter.post('/matches', isAuthenticated, createMatch);
managerRouter.get('/matches/:id', isAuthenticated, getMatchById);
managerRouter.get('/matches/code/:matchCode', isAuthenticated, getMatchByCode);
managerRouter.get('/matches/table/:tableId', isAuthenticated, getMatchesByTable);
managerRouter.get('/matches/history/:membershipId', isAuthenticated, getMatchHistory);

managerRouter.put('/matches/:id/score', isAuthenticated, findMatchById, updateScore);
managerRouter.put('/matches/:id/teams/:teamIndex/members', isAuthenticated, findMatchById, updateTeamMembers);
managerRouter.put('/matches/:id/start', isAuthenticated, findMatchById, startMatch);
managerRouter.put('/matches/:id/end', isAuthenticated, findMatchById, endMatch);
managerRouter.delete('/matches/:id', isAuthenticated, findMatchById, deleteMatch);


export default managerRouter;