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
    getMatchesByTable
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

export default membershipRoute;