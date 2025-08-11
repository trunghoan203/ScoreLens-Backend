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
    getMatchHistory,
} from '../controllers/Match.controller';
import { isMatchCreator } from '../middlewares/auth/matchAuth.middleware';
import { findMatchById } from '../middlewares/utils/findMatchById.middleware';

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
membershipRoute.put('/matches/:id/score', isMatchCreator, updateScore);
membershipRoute.put('/matches/:id/teams/:teamIndex/members', isMatchCreator, updateTeamMembers);
membershipRoute.put('/matches/:id/start', isMatchCreator, startMatch);
membershipRoute.put('/matches/:id/end', isMatchCreator, endMatch);
membershipRoute.delete('/matches/:id', isMatchCreator, deleteMatch);

// History and other getters
membershipRoute.get('/matches/table/:tableId', getMatchesByTable);
membershipRoute.get('/matches/history/:membershipId', getMatchHistory);

// Additional Match routes with findMatchById middleware
membershipRoute.patch('/matches/:id/score', findMatchById, updateScore);
membershipRoute.patch('/matches/:id/teams', findMatchById, updateTeamMembers);
membershipRoute.patch('/matches/:id/start', findMatchById, startMatch);
membershipRoute.patch('/matches/:id/end', findMatchById, endMatch);

export default membershipRoute;