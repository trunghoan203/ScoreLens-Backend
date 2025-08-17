import { Request, Response, NextFunction } from 'express';
import { Match } from '../../models/Match.model';

export const isMatchCreator = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const matchId = req.params.id || req.params.matchId;
        
        const { actorMembershipId, actorGuestToken } = req.body;

        if (!matchId) {
            res.status(400).json({ success: false, message: 'Match ID là bắt buộc trong request params.' });
            return;
        }
        
        if (!actorMembershipId && !actorGuestToken) {
            res.status(403).json({ success: false, message: 'Cần có định danh người thực hiện (actorMembershipId hoặc actorGuestToken).' });
            return;
        }

        const match = await Match.findOne({ matchId: matchId });
        if (!match) {
            res.status(404).json({ success: false, message: 'Trận đấu không tồn tại.' });
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
            message: 'Chỉ có chủ phòng mới có thể thực hiện hành động này.'
        });

    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ' });
    }
};