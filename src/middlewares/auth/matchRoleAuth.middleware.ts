import { Request, Response, NextFunction } from 'express';
import { Match, IMatch } from '../../models/Match.model';
import { MESSAGES } from '../../config/messages';

export const requireMatchRole = (requiredRole: 'host' | 'participant') => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const match = (req as any).match as IMatch;
            const { sessionToken } = req.body;

            if (!match) {
                res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy trận đấu.'
                });
                return;
            }

            if (!sessionToken) {
                res.status(400).json({
                    success: false,
                    message: 'Vui lòng cung cấp sessionToken.'
                });
                return;
            }

            // Tìm member với sessionToken
            let member = null;
            for (const team of match.teams) {
                member = team.members.find(m => m.sessionToken === sessionToken);
                if (member) break;
            }

            if (!member) {
                res.status(403).json({
                    success: false,
                    message: 'SessionToken không hợp lệ.'
                });
                return;
            }

            // Kiểm tra role
            if (member.role !== requiredRole) {
                res.status(403).json({
                    success: false,
                    message: requiredRole === 'host' 
                        ? 'Bạn không có quyền chỉnh sửa trận đấu này. Chỉ người tạo trận đấu mới có quyền này.' 
                        : 'Bạn không có quyền thực hiện thao tác này.'
                });
                return;
            }

            // Lưu thông tin member vào request để sử dụng sau
            (req as any).matchMember = member;
            next();
        } catch (error: any) {
            res.status(500).json({ success: false, message: MESSAGES.MSG100 });
        }
    };
};

export const requireHostRole = requireMatchRole('host');
export const requireParticipantRole = requireMatchRole('participant');
