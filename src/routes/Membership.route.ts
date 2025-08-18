import express from 'express';
import { createFeedback } from '../controllers/Feedback.controller';
import { searchMembership, getMembershipById } from '../controllers/Membership.controller';
import {
    verifyMembership,
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
    joinMatch,
    leaveMatch,
    getMatchHistory,
    getUserSessionToken,
} from '../controllers/Match.controller';
import { findMatchById } from '../middlewares/utils/findMatchById.middleware';
import { requireHostRole } from '../middlewares/auth/matchRoleAuth.middleware';

const membershipRoute = express.Router();

// Public routes
membershipRoute.get('/search/:membershipId', searchMembership);
membershipRoute.get('/:id', getMembershipById);

// Protected routes
membershipRoute.post('/feedback', createFeedback);

//Match Management
membershipRoute.post('/matches/verify-table', verifyTable);
membershipRoute.post('/matches/verify-membership', verifyMembership);
membershipRoute.post('/matches', createMatch);
membershipRoute.get('/matches/:id', getMatchById);
membershipRoute.get('/matches/code/:matchCode', getMatchByCode);
membershipRoute.post('/matches/join', joinMatch);
membershipRoute.post('/matches/leave', leaveMatch);
membershipRoute.post('/matches/:matchId/session-token', getUserSessionToken);

// Host-only routes (chỉ người tạo trận đấu mới có quyền)
membershipRoute.put('/matches/:id/score', findMatchById, requireHostRole, updateScore);
membershipRoute.put('/matches/:id/teams', findMatchById, requireHostRole, updateTeamMembers);
membershipRoute.put('/matches/:id/start', findMatchById, requireHostRole, startMatch);
membershipRoute.put('/matches/:id/end', findMatchById, requireHostRole, endMatch);
membershipRoute.delete('/matches/:id', findMatchById, requireHostRole, deleteMatch);

// History and other getters
membershipRoute.get('/matches/table/:tableId', getMatchesByTable);
membershipRoute.get('/matches/history/:membershipId', getMatchHistory);

export default membershipRoute;