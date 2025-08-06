import { Request, Response, NextFunction } from 'express';
import { Match } from '../../models/Match.model';

export const isMatchCreator = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const matchId = req.params.id || req.params.matchId;
        
        const { actorMembershipId, actorGuestToken } = req.body;

        if (!matchId) {
            res.status(400).json({ success: false, message: 'Match ID is required in request params.' });
            return;
        }
        
        if (!actorMembershipId && !actorGuestToken) {
            res.status(403).json({ success: false, message: 'An actor identifier (actorMembershipId or actorGuestToken) is required.' });
            return;
        }

        const match = await Match.findOne({ matchId: matchId });
        if (!match) {
            res.status(404).json({ success: false, message: 'Match not found.' });
            return;
        }

        let isAuthorized = false;

        if (actorMembershipId && match.createdByMembershipId === actorMembershipId) {
            isAuthorized = true;
        }
        else if (actorGuestToken && match.creatorGuestToken === actorGuestToken) {
            isAuthorized = true;
        }
        if (isAuthorized) {
            (req as any).match = match;
            return next();
        }
        
        res.status(403).json({
            success: false,
            message: 'Forbidden: Only the creator of the match can perform this action.'
        });

    } catch (error: any) {
        console.error('isMatchParticipant middleware error:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};