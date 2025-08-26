// Export all authentication middlewares
export { isAuthenticated } from './auth.middleware';
export { autoRefreshToken } from './autoRefreshToken.middleware';
export { isGuestOrAuthenticated, isGuestOnly } from './guestAuth.middleware';
export { isMatchCreator } from './matchAuth.middleware';
export { requireMatchRole, requireHostRole, requireParticipantRole } from './matchRoleAuth.middleware';
