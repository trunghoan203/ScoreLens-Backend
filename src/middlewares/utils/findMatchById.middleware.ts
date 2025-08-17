import { Request, Response, NextFunction } from 'express';
import { Match } from '../../models/Match.model';
import { MESSAGES } from '../../config/messages';

export const findMatchById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const matchId = req.params.id || req.params.matchId;
        if (!matchId) {
            res.status(400).json({ success: false, message: MESSAGES.MSG96 });
            return;
        }

        const match = await Match.findOne({ matchId: matchId });
        if (!match) {
            res.status(404).json({ success: false, message: MESSAGES.MSG81 });
            return;
        }

        (req as any).match = match;
        next();
    } catch (error) {
        res.status(500).json({ success: false, message: MESSAGES.MSG100 });
    }
};