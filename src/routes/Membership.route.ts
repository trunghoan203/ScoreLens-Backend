import { validate } from './../middlewares/validate.middleware';
import express from 'express';
import { createFeedback } from '../controllers/Feedback.controller';
import { searchMembership, getMembershipById, getMembershipByPhoneNumber } from '../controllers/Membership.controller';
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
import { allowManagerOrHost } from '../middlewares/auth/matchRoleAuth.middleware';
import { createFeedbackSchema, membershipCodeSchema } from '../validations';

const membershipRoute = express.Router();

membershipRoute.get('/search/:membershipId', searchMembership);
membershipRoute.get('/phone/:phoneNumber', getMembershipByPhoneNumber);
membershipRoute.get('/:id', getMembershipById);
membershipRoute.post('/feedback', validate(createFeedbackSchema), createFeedback);

membershipRoute.post('/matches/verify-table', verifyTable);
membershipRoute.post('/matches/verify-membership', validate(membershipCodeSchema), verifyMembership);
membershipRoute.post('/matches', createMatch);
membershipRoute.get('/matches/:id', getMatchById);
membershipRoute.get('/matches/code/:matchCode', getMatchByCode);
membershipRoute.post('/matches/join', joinMatch);
membershipRoute.post('/matches/leave', leaveMatch);
membershipRoute.post('/matches/:matchId/session-token', getUserSessionToken);

membershipRoute.put('/matches/:id/score', findMatchById, allowManagerOrHost, updateScore);
membershipRoute.put('/matches/:id/teams', findMatchById, allowManagerOrHost, updateTeamMembers);
membershipRoute.put('/matches/:id/start', findMatchById, allowManagerOrHost, startMatch);
membershipRoute.put('/matches/:id/end', findMatchById, allowManagerOrHost, endMatch);
membershipRoute.delete('/matches/:id', findMatchById, allowManagerOrHost, deleteMatch);

membershipRoute.get('/matches/table/:tableId', getMatchesByTable);
membershipRoute.get('/matches/history/:phoneNumber', getMatchHistory);

export default membershipRoute;