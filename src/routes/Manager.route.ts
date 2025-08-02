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
    cancelMatch,
    getMatchesByTable,
    verifyTable,
    joinMatch,
    requestPermission,
    approveRejectPermission,
    getMatchHistory,
    getMatchPermissions
} from '../controllers/Match.controller';
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
managerRouter.get('/matches/:id', getMatchById);
managerRouter.get('/matches/code/:matchCode', getMatchByCode);
managerRouter.put('/matches/:id/score', isAuthenticated, updateScore);
managerRouter.put('/matches/:id/teams/:teamIndex/members', isAuthenticated, updateTeamMembers);
managerRouter.put('/matches/:id/start', isAuthenticated, startMatch);
managerRouter.put('/matches/:id/end', isAuthenticated, endMatch);
managerRouter.put('/matches/:id/cancel', isAuthenticated, cancelMatch);
managerRouter.get('/matches/table/:tableId', getMatchesByTable);

// New APIs for enhanced match management
managerRouter.post('/matches/verify-table', verifyTable);
managerRouter.post('/matches/join', isAuthenticated, joinMatch);
managerRouter.post('/matches/:id/request-permission', isAuthenticated, requestPermission);
managerRouter.put('/matches/:id/permission/:requestId', isAuthenticated, approveRejectPermission);
managerRouter.get('/matches/history/:membershipId', getMatchHistory);
managerRouter.get('/matches/:id/permissions', isAuthenticated, getMatchPermissions);

export default managerRouter;