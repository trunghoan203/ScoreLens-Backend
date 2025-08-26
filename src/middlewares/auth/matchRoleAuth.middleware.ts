import { Request, Response, NextFunction } from 'express';
import { Match, IMatch } from '../../models/Match.model';
import { MESSAGES } from '../../config/messages';
import jwt from 'jsonwebtoken';
import { Manager } from '../../models/Manager.model';
import { Camera } from '../../models/Camera.model';

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

            if (member.role !== requiredRole) {
                res.status(403).json({
                    success: false,
                    message: requiredRole === 'host' 
                        ? 'Bạn không có quyền chỉnh sửa trận đấu này. Chỉ người tạo trận đấu mới có quyền này.' 
                        : 'Bạn không có quyền thực hiện thao tác này.'
                });
                return;
            }

            (req as any).matchMember = member;
            next();
        } catch (error: any) {
            res.status(500).json({ success: false, message: MESSAGES.MSG100 });
        }
    };
};

export const requireHostRole = requireMatchRole('host');
export const requireParticipantRole = requireMatchRole('participant');

export const allowManagerOrHost = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const match = (req as any).match as IMatch;
        if (!match) {
            res.status(404).json({ success: false, message: 'Không tìm thấy trận đấu.' });
            return;
        }
        let token = (req as any).cookies?.access_token as string | undefined;
        if (!token) {
            const authHeader = req.header('Authorization');
            if (authHeader && authHeader.startsWith('Bearer ')) {
                token = authHeader.replace('Bearer ', '');
            }
        }

        if (token) {
            try {
                const secret = process.env.ACCESS_TOKEN;
                if (!secret) throw new Error(MESSAGES.MSG130);
                const decoded = (jwt as any).verify(token, secret) as { managerId?: string };
                if (decoded?.managerId) {
                    const manager = await Manager.findOne({ managerId: decoded.managerId });
                    if (manager) {
                        (req as any).manager = manager;
                        return void next();
                    }
                }
            } catch (_) {
            }
        }
        const { sessionToken } = req.body as { sessionToken?: string };
        if (!sessionToken) {
            res.status(400).json({ success: false, message: 'Vui lòng cung cấp sessionToken.' });
            return;
        }

        let member: any = null;
        for (const team of match.teams) {
            member = team.members.find(m => m.sessionToken === sessionToken);
            if (member) break;
        }

        if (!member) {
            res.status(403).json({ success: false, message: 'SessionToken không hợp lệ.' });
            return;
        }

        if (member.role !== 'host') {
            res.status(403).json({ success: false, message: 'Bạn không có quyền chỉnh sửa trận đấu này. Chỉ người tạo trận đấu mới có quyền này.' });
            return;
        }

        (req as any).matchMember = member;
        next();
    } catch (error: any) {
        res.status(500).json({ success: false, message: MESSAGES.MSG100 });
    }
};

export const allowManagerOrMatchCreator = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { cameraId } = req.params;
        const { createdByMembershipId, creatorGuestToken } = req.body;
        const sessionToken = req.header('x-session-token');

        let token = (req as any).cookies?.access_token as string | undefined;
        if (!token) {
            const authHeader = req.header('Authorization');
            if (authHeader && authHeader.startsWith('Bearer ')) {
                token = authHeader.replace('Bearer ', '');
            }
        }

        if (token) {
            try {
                const secret = process.env.ACCESS_TOKEN;
                if (!secret) throw new Error(MESSAGES.MSG130);
                const decoded = (jwt as any).verify(token, secret) as { managerId?: string };
                if (decoded?.managerId) {
                    const manager = await Manager.findOne({ managerId: decoded.managerId });
                    if (manager) {
                        (req as any).manager = manager;
                        return void next();
                    }
                }
            } catch (_) {
            }
        }

        if (sessionToken) {
            const match = await Match.findOne({
                'teams.members.sessionToken': sessionToken,
                status: { $in: ['pending', 'ongoing'] }
            });

            if (match) {
                const camera = await Camera.findOne({ cameraId });
                if (camera && camera.tableId === match.tableId) {
                    (req as any).match = match;
                    return void next();
                }
            }
        }

        if (!createdByMembershipId && !creatorGuestToken) {
            res.status(400).json({ 
                success: false, 
                message: 'Cần cung cấp sessionToken, createdByMembershipId hoặc creatorGuestToken' 
            });
            return;
        }

        const camera = await Camera.findOne({ cameraId });
        if (!camera) {
            res.status(404).json({ success: false, message: 'Camera không tồn tại' });
            return;
        }

        const match = await Match.findOne({
            tableId: camera.tableId,
            status: { $in: ['pending', 'ongoing'] }
        });

        if (!match) {
            res.status(404).json({ success: false, message: 'Không tìm thấy trận đấu đang diễn ra trên bàn này' });
            return;
        }

        let hasAccess = false;
        
        if (createdByMembershipId && match.createdByMembershipId === createdByMembershipId) {
            hasAccess = true;
        }
        
        if (creatorGuestToken && match.creatorGuestToken === creatorGuestToken) {
            hasAccess = true;
        }

        if (!hasAccess) {
            res.status(403).json({ 
                success: false, 
                message: 'Bạn không có quyền truy cập camera này. Chỉ người tạo trận đấu mới có quyền này.' 
            });
            return;
        }

        (req as any).match = match;
        next();
    } catch (error: any) {
        res.status(500).json({ success: false, message: MESSAGES.MSG100 });
    }
};

export const allowManagerOrMatchCreatorForDownload = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { cameraId } = req.params;
        const createdByMembershipId = req.query.createdByMembershipId as string;
        const creatorGuestToken = req.query.creatorGuestToken as string;
        const sessionToken = req.header('x-session-token');

        let token = (req as any).cookies?.access_token as string | undefined;
        if (!token) {
            const authHeader = req.header('Authorization');
            if (authHeader && authHeader.startsWith('Bearer ')) {
                token = authHeader.replace('Bearer ', '');
            }
        }

        if (token) {
            try {
                const secret = process.env.ACCESS_TOKEN;
                if (!secret) throw new Error(MESSAGES.MSG130);
                const decoded = (jwt as any).verify(token, secret) as { managerId?: string };
                if (decoded?.managerId) {
                    const manager = await Manager.findOne({ managerId: decoded.managerId });
                    if (manager) {
                        (req as any).manager = manager;
                        return void next();
                    }
                }
            } catch (_) {
            }
        }

        if (sessionToken) {
            const match = await Match.findOne({
                'teams.members.sessionToken': sessionToken,
                status: { $in: ['pending', 'ongoing', 'completed'] }
            });

            if (match) {
                const camera = await Camera.findOne({ cameraId });
                if (camera && camera.tableId === match.tableId) {
                    (req as any).match = match;
                    return void next();
                }
            }
        }

        if (!createdByMembershipId && !creatorGuestToken) {
            res.status(400).json({ 
                success: false, 
                message: 'Cần cung cấp sessionToken, createdByMembershipId hoặc creatorGuestToken' 
            });
            return;
        }

        const camera = await Camera.findOne({ cameraId });
        if (!camera) {
            res.status(404).json({ success: false, message: 'Camera không tồn tại' });
            return;
        }

        const match = await Match.findOne({
            tableId: camera.tableId,
            status: { $in: ['pending', 'ongoing', 'completed'] }
        });

        if (!match) {
            res.status(404).json({ success: false, message: 'Không tìm thấy trận đấu trên bàn này' });
            return;
        }

        let hasAccess = false;
        
        if (createdByMembershipId && match.createdByMembershipId === createdByMembershipId) {
            hasAccess = true;
        }
        
        if (creatorGuestToken && match.creatorGuestToken === creatorGuestToken) {
            hasAccess = true;
        }

        if (!hasAccess) {
            res.status(403).json({ 
                success: false, 
                message: 'Bạn không có quyền truy cập video này. Chỉ người tạo trận đấu mới có quyền này.' 
            });
            return;
        }

        (req as any).match = match;
        next();
    } catch (error: any) {
        res.status(500).json({ success: false, message: MESSAGES.MSG100 });
    }
};
