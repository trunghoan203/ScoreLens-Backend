import express from 'express';
import { z } from 'zod';
import { loginManager, verifyLogin, getProfile, logoutManager, resendLoginCode } from '../controllers/Manager.controller';
import {
    listTables,
    createTable,
    updateTable,
    deleteTable,
    getTableById,
    getTablesByClub,
    verifyTable
} from '../controllers/Table.controller';
import { createMembership, listMemberships, updateMembership, deleteMembership } from '../controllers/Membership.controller';
import {
    listCameras,
    createCamera,
    updateCamera,
    deleteCamera,
    cameraConnection,
    startVideoStream,
    stopVideoStream,
    recordCamera,
    getRecordStatus,
    deleteRecording,
    cleanupRecordings,
    downloadRecording,
    streamRecordingPublic,
} from '../controllers/Camera.controller';

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
    getMatchHistory,
    joinMatch,
    updateVideoUrl,
    startAutoRecording,
    stopAutoRecording,
    getAutoRecordingStatus,
} from '../controllers/Match.controller';
import { isAuthenticated } from '../middlewares/auth/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
    loginManagerSchema,
    createTableSchema,
    updateTableSchema,
    createMembershipSchema,
    updateMembershipSchema,
    createCameraSchema,
    updateCameraSchema,
    emailSchema,
    updateFeedbackSchema
} from '../validations';
import { findMatchById } from '../middlewares/utils/findMatchById.middleware';
import { allowManagerOrHost, allowManagerOrMatchCreator, allowManagerOrMatchCreatorForDownload } from '../middlewares/auth/matchRoleAuth.middleware';

const managerRouter = express.Router();

managerRouter.post('/login', validate(loginManagerSchema), loginManager);
managerRouter.post('/login/verify', verifyLogin);
managerRouter.post('/resend-login-code', validate(emailSchema), resendLoginCode);

// Protected routes (require authentication)
managerRouter.post('/logout', isAuthenticated, logoutManager);
managerRouter.get('/profile', isAuthenticated, getProfile);

// Table management routes for manager
managerRouter.get('/table', isAuthenticated, listTables);
managerRouter.post('/table', isAuthenticated, validate(createTableSchema), createTable);
managerRouter.put('/table/:tableId', isAuthenticated, validate(updateTableSchema), updateTable);
managerRouter.delete('/table/:tableId', isAuthenticated, deleteTable);

// Public table routes (không cần xác thực)
managerRouter.post('/table/verify', verifyTable);
managerRouter.get('/table/club/:clubId', getTablesByClub);
managerRouter.get('/table/:tableId', getTableById);

// Membership management routes for manager
managerRouter.get('/membership', isAuthenticated, listMemberships);
managerRouter.post('/membership', isAuthenticated, validate(createMembershipSchema), createMembership);
managerRouter.put('/membership/:membershipId', isAuthenticated, validate(updateMembershipSchema), updateMembership);
managerRouter.delete('/membership/:membershipId', isAuthenticated, deleteMembership)

// Camera management routes for manager
managerRouter.get('/camera', isAuthenticated, listCameras);
managerRouter.post('/camera/test-connection', isAuthenticated, cameraConnection);
managerRouter.post('/camera', isAuthenticated, validate(createCameraSchema), createCamera);
managerRouter.put('/camera/:cameraId', isAuthenticated, validate(updateCameraSchema), updateCamera);
managerRouter.delete('/camera/:cameraId', isAuthenticated, deleteCamera);
managerRouter.post('/camera/:cameraId/record', isAuthenticated, recordCamera);

// Recording management routes
managerRouter.get('/camera/:cameraId/recordings', isAuthenticated, getRecordStatus);
managerRouter.get('/matches/:matchId/recordings', isAuthenticated, getRecordStatus);
managerRouter.get('/camera/:cameraId/recordings/:jobId/download', allowManagerOrMatchCreatorForDownload, downloadRecording);
managerRouter.delete('/camera/:cameraId/recordings/:jobId', isAuthenticated, deleteRecording);
managerRouter.post('/camera/:cameraId/recordings/cleanup', isAuthenticated, cleanupRecordings);

// Public video streaming route (không cần xác thực)
managerRouter.get('/camera/:cameraId/recordings/:jobId/stream', streamRecordingPublic);

// Video stream routes - Manager hoặc người tạo match có thể truy cập
managerRouter.post('/camera/:cameraId/stream/start', allowManagerOrMatchCreator, startVideoStream);
managerRouter.post('/camera/:cameraId/stream/stop', allowManagerOrMatchCreator, stopVideoStream);

// Feedback management routes for manager
managerRouter.get('/feedback', isAuthenticated, getFeedbacks);
managerRouter.get('/feedback/:feedbackId', isAuthenticated, getFeedbackDetail);
managerRouter.put('/feedback/:feedbackId', isAuthenticated, validate(updateFeedbackSchema), updateFeedback);

// Match management routes for manager
managerRouter.post('/matches', isAuthenticated, createMatch);
managerRouter.get('/matches/:id', isAuthenticated, getMatchById);
managerRouter.get('/matches/code/:matchCode', isAuthenticated, getMatchByCode);
managerRouter.get('/matches/table/:tableId', isAuthenticated, getMatchesByTable);
managerRouter.get('/matches/history/:membershipId', isAuthenticated, getMatchHistory);

managerRouter.put('/matches/:id/score', isAuthenticated, findMatchById, updateScore);
managerRouter.put('/matches/:id/teams', isAuthenticated, findMatchById, updateTeamMembers);
managerRouter.put('/matches/:id/video-url', isAuthenticated, findMatchById, updateVideoUrl);
managerRouter.put('/matches/:id/start', isAuthenticated, findMatchById, startMatch);
managerRouter.put('/matches/:id/end', isAuthenticated, findMatchById, endMatch);
managerRouter.delete('/matches/:id', isAuthenticated, findMatchById, deleteMatch);

// Auto recording routes
managerRouter.post('/matches/:matchId/auto-record/start', isAuthenticated, startAutoRecording);
managerRouter.post('/matches/:matchId/auto-record/stop', isAuthenticated, stopAutoRecording);
managerRouter.get('/matches/:matchId/auto-record/status', isAuthenticated, getAutoRecordingStatus);

managerRouter.post('/matches/join', joinMatch);


export default managerRouter;