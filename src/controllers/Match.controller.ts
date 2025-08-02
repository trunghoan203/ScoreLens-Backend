import { Request, Response } from 'express';
import { Match, IMatch, IMatchTeam } from '../models/Match.model';
import { Table } from '../models/Table.model';
import { Membership } from '../models/Membership.model';
import { generateMatchCode } from '../utils/generateCode';

// @desc    Tạo một trận đấu mới
// @route   POST /api/matches
// @access  Private (Manager hoặc Membership/Guest)
export const createMatch = async (req: Request, res: Response): Promise<void> => {
    try {
        const { tableId, gameType, isAiAssisted, teams } = req.body;
        const { managerId, membershipId, isGuest, guestId } = req as any; // Lấy từ middleware xác thực

        // 1. Kiểm tra đầu vào
        if (!tableId || !gameType || !teams || !Array.isArray(teams) || teams.length < 2) {
            res.status(400).json({
                success: false,
                message: 'Vui lòng cung cấp đủ thông tin: tableId, gameType, teams (ít nhất 2 đội).'
            });
            return;
        }

        // 2. Kiểm tra bàn có tồn tại và đang rảnh không?
        const table = await Table.findOne({ tableId: tableId });
        if (!table) {
            res.status(404).json({
                success: false,
                message: 'Không tìm thấy bàn chơi.'
            });
            return;
        }
        if (table.status !== 'empty') {
            res.status(409).json({
                success: false,
                message: 'Bàn này hiện đang được sử dụng.'
            });
            return;
        }

        // 3. Tạo matchId và matchCode duy nhất
        const matchId = `MT-${Date.now()}-${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`;
        let matchCode = '';
        let isCodeUnique = false;
        while (!isCodeUnique) {
            matchCode = generateMatchCode();
            const existingMatch = await Match.findOne({ matchCode });
            if (!existingMatch) {
                isCodeUnique = true;
            }
        }

        // 4. Tạo đối tượng trận đấu mới
        const newMatch = new Match({
            matchId,
            tableId,
            gameType,
            isAiAssisted,
            teams,
            matchCode,
            managerId: managerId || null,
            createdByMembershipId: membershipId || null,
            // Nếu là guest, lưu thông tin guest
            ...(isGuest && { guestId }),
            startTime: new Date(),
            status: 'pending'
        });

        const savedMatch = await newMatch.save();

        // 5. Cập nhật trạng thái của bàn thành "inuse"
        await Table.findOneAndUpdate({ tableId: tableId }, { status: 'inuse' });

        res.status(201).json({
            success: true,
            data: savedMatch
        });

    } catch (error: any) {
        console.error('Error creating match:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi tạo trận đấu',
            error: error.message
        });
    }
};

// @desc    Lấy thông tin chi tiết một trận đấu
// @route   GET /api/matches/:id
// @access  Public
export const getMatchById = async (req: Request, res: Response): Promise<void> => {
    try {
        const match = await Match.findOne({ matchId: req.params.id });

        if (!match) {
            res.status(404).json({
                success: false,
                message: 'Không tìm thấy trận đấu.'
            });
            return;
        }

        res.status(200).json({
            success: true,
            data: match
        });
    } catch (error: any) {
        console.error('Error getting match:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: error.message
        });
    }
};

// @desc    Lấy trận đấu theo mã
// @route   GET /api/matches/code/:matchCode
// @access  Public
export const getMatchByCode = async (req: Request, res: Response): Promise<void> => {
    try {
        const { matchCode } = req.params;

        const match = await Match.findOne({ matchCode });

        if (!match) {
            res.status(404).json({
                success: false,
                message: 'Không tìm thấy trận đấu với mã này.'
            });
            return;
        }

        res.status(200).json({
            success: true,
            data: match
        });
    } catch (error: any) {
        console.error('Error getting match by code:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: error.message
        });
    }
};

// @desc    Cập nhật điểm số cho một đội
// @route   PUT /api/matches/:id/score
// @access  Private
export const updateScore = async (req: Request, res: Response): Promise<void> => {
    try {
        const { teamIndex, score, notes } = req.body;
        const matchId = req.params.id;

        if (teamIndex === undefined || score === undefined) {
            res.status(400).json({
                success: false,
                message: 'Vui lòng cung cấp teamIndex và score.'
            });
            return;
        }

        const match = await Match.findOne({ matchId: matchId });
        if (!match) {
            res.status(404).json({
                success: false,
                message: 'Không tìm thấy trận đấu.'
            });
            return;
        }

        // Kiểm tra trạng thái trận đấu
        if (match.status === 'completed' || match.status === 'cancelled') {
            res.status(400).json({
                success: false,
                message: 'Không thể cập nhật thông tin trận đấu đã hoàn thành hoặc đã bị hủy.'
            });
            return;
        }

        if (teamIndex < 0 || teamIndex >= match.teams.length) {
            res.status(400).json({
                success: false,
                message: 'Chỉ số đội không hợp lệ.'
            });
            return;
        }

        // Cập nhật điểm số
        match.teams[teamIndex].score = score;

        // Cập nhật ghi chú nếu có
        if (notes) {
            (match as any).notes = notes;
        }

        const updatedMatch = await match.save();

        res.status(200).json({
            success: true,
            data: updatedMatch
        });
    } catch (error: any) {
        console.error('Error updating score:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: error.message
        });
    }
};

// @desc    Cập nhật thành viên trong đội
// @route   PUT /api/matches/:id/teams/:teamIndex/members
// @access  Private
export const updateTeamMembers = async (req: Request, res: Response): Promise<void> => {
    try {
        const { teamIndex } = req.params;
        const { members } = req.body || {};
        const matchId = req.params.id;

        // Kiểm tra req.body có tồn tại không
        if (!req.body) {
            res.status(400).json({
                success: false,
                message: 'Request body không được cung cấp.'
            });
            return;
        }

        if (!members || !Array.isArray(members)) {
            res.status(400).json({
                success: false,
                message: 'Members phải là một mảng.'
            });
            return;
        }

        const match = await Match.findOne({ matchId: matchId });
        if (!match) {
            res.status(404).json({
                success: false,
                message: 'Không tìm thấy trận đấu.'
            });
            return;
        }

        // Kiểm tra trạng thái trận đấu
        if (match.status === 'completed' || match.status === 'cancelled') {
            res.status(400).json({
                success: false,
                message: 'Không thể cập nhật thông tin trận đấu đã hoàn thành hoặc đã bị hủy.'
            });
            return;
        }

        const teamIndexNum = parseInt(teamIndex);
        if (teamIndexNum < 0 || teamIndexNum >= match.teams.length) {
            res.status(400).json({
                success: false,
                message: 'Chỉ số đội không hợp lệ.'
            });
            return;
        }

        // Cập nhật thành viên
        match.teams[teamIndexNum].members = members;

        const updatedMatch = await match.save();

        res.status(200).json({
            success: true,
            data: updatedMatch
        });
    } catch (error: any) {
        console.error('Error updating team members:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: error.message
        });
    }
};

// @desc    Bắt đầu trận đấu
// @route   PUT /api/matches/:id/start
// @access  Private
export const startMatch = async (req: Request, res: Response): Promise<void> => {
    try {
        const matchId = req.params.id;

        const match = await Match.findOne({ matchId: matchId });
        if (!match) {
            res.status(404).json({
                success: false,
                message: 'Không tìm thấy trận đấu.'
            });
            return;
        }

        if (match.status !== 'pending') {
            res.status(400).json({
                success: false,
                message: 'Trận đấu không thể bắt đầu ở trạng thái hiện tại.'
            });
            return;
        }

        // Kiểm tra xem có đủ thành viên không
        const hasMembers = match.teams.every(team => team.members.length > 0);
        if (!hasMembers) {
            res.status(400).json({
                success: false,
                message: 'Tất cả các đội phải có ít nhất một thành viên.'
            });
            return;
        }

        match.status = 'ongoing';
        match.startTime = new Date();

        const updatedMatch = await match.save();

        res.status(200).json({
            success: true,
            data: updatedMatch
        });
    } catch (error: any) {
        console.error('Error starting match:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: error.message
        });
    }
};

// @desc    Kết thúc trận đấu
// @route   PUT /api/matches/:id/end
// @access  Private
export const endMatch = async (req: Request, res: Response): Promise<void> => {
    try {
        const matchId = req.params.id;
        const match = await Match.findOne({ matchId: matchId });

        if (!match) {
            res.status(404).json({
                success: false,
                message: 'Không tìm thấy trận đấu.'
            });
            return;
        }

        if (match.status === 'completed') {
            res.status(400).json({
                success: false,
                message: 'Trận đấu đã kết thúc rồi.'
            });
            return;
        }

        if (match.status === 'cancelled') {
            res.status(400).json({
                success: false,
                message: 'Không thể kết thúc trận đấu đã bị hủy.'
            });
            return;
        }

        // Xác định đội thắng
        let winningTeamIndex = -1;
        let highestScore = -1;

        match.teams.forEach((team, index) => {
            if (team.score > highestScore) {
                highestScore = team.score;
                winningTeamIndex = index;
            }
        });

        // Cập nhật đội thắng
        if (winningTeamIndex >= 0) {
            match.teams[winningTeamIndex].isWinner = true;
        }

        // Cập nhật trạng thái trận đấu
        match.status = 'completed';
        match.endTime = new Date();

        const finishedMatch = await match.save();

        // Cập nhật trạng thái bàn về 'empty'
        await Table.findOneAndUpdate({ tableId: match.tableId }, { status: 'empty' });

        res.status(200).json({
            success: true,
            data: finishedMatch
        });
    } catch (error: any) {
        console.error('Error ending match:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: error.message
        });
    }
};

// @desc    Hủy trận đấu
// @route   PUT /api/matches/:id/cancel
// @access  Private
export const cancelMatch = async (req: Request, res: Response): Promise<void> => {
    try {
        const matchId = req.params.id;
        const match = await Match.findOne({ matchId: matchId });

        if (!match) {
            res.status(404).json({
                success: false,
                message: 'Không tìm thấy trận đấu.'
            });
            return;
        }

        if (match.status === 'completed') {
            res.status(400).json({
                success: false,
                message: 'Không thể hủy trận đấu đã kết thúc.'
            });
            return;
        }

        if (match.status === 'cancelled') {
            res.status(400).json({
                success: false,
                message: 'Trận đấu đã bị hủy rồi.'
            });
            return;
        }

        match.status = 'cancelled';
        const cancelledMatch = await match.save();

        // Cập nhật trạng thái bàn về 'empty'
        await Table.findOneAndUpdate({ tableId: match.tableId }, { status: 'empty' });

        res.status(200).json({
            success: true,
            data: cancelledMatch
        });
    } catch (error: any) {
        console.error('Error cancelling match:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: error.message
        });
    }
};

// @desc    Lấy danh sách trận đấu theo bàn
// @route   GET /api/matches/table/:tableId
// @access  Public
export const getMatchesByTable = async (req: Request, res: Response): Promise<void> => {
    try {
        const { tableId } = req.params;
        const { status, limit = 10, page = 1 } = req.query;

        const query: any = { tableId: tableId };
        if (status) {
            query.status = status;
        }

        const matches = await Match.find(query)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit as string))
            .skip((parseInt(page as string) - 1) * parseInt(limit as string));

        const total = await Match.countDocuments(query);

        res.status(200).json({
            success: true,
            data: matches,
            pagination: {
                page: parseInt(page as string),
                limit: parseInt(limit as string),
                total,
                pages: Math.ceil(total / parseInt(limit as string))
            }
        });
    } catch (error: any) {
        console.error('Error getting matches by table:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: error.message
        });
    }
};