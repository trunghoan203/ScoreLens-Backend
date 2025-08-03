import express from 'express';
import { createFeedback } from '../controllers/Feedback.controller';
import { searchMembership, getMembershipById } from '../controllers/Membership.controller';
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
import { isGuestOrAuthenticated } from '../middlewares/auth/guestAuth.middleware';

const membershipRoute = express.Router();

// Public routes
membershipRoute.get('/search/:membershipId', searchMembership);
membershipRoute.get('/:id', getMembershipById);

// Protected routes
membershipRoute.post('/feedback', createFeedback);

// Match management routes (cho cả Membership và Guest)
membershipRoute.post('/matches', isGuestOrAuthenticated, createMatch);
membershipRoute.get('/matches/:id', getMatchById);
membershipRoute.get('/matches/code/:matchCode', getMatchByCode);
membershipRoute.put('/matches/:id/score', isGuestOrAuthenticated, updateScore);
membershipRoute.put('/matches/:id/teams/:teamIndex/members', isGuestOrAuthenticated, updateTeamMembers);
membershipRoute.put('/matches/:id/start', isGuestOrAuthenticated, startMatch);
membershipRoute.put('/matches/:id/end', isGuestOrAuthenticated, endMatch);
membershipRoute.put('/matches/:id/cancel', isGuestOrAuthenticated, cancelMatch);
membershipRoute.get('/matches/table/:tableId', getMatchesByTable);

// New APIs for enhanced match management
membershipRoute.post('/matches/verify-table', verifyTable);
membershipRoute.post('/matches/join', isGuestOrAuthenticated, joinMatch);
membershipRoute.post('/matches/:id/request-permission', isGuestOrAuthenticated, requestPermission);
membershipRoute.put('/matches/:id/permission/:requestId', isGuestOrAuthenticated, approveRejectPermission);
membershipRoute.get('/matches/history/:membershipId', getMatchHistory);
membershipRoute.get('/matches/:id/permissions', isGuestOrAuthenticated, getMatchPermissions);

export default membershipRoute;