import { Request, Response } from 'express';
import { Match, IMatchTeamMember, IMatch, IMatchTeam } from '../models/Match.model';
import { Table } from '../models/Table.model';
import { Membership } from '../models/Membership.model';
import { generateMatchCode } from '../utils/generateCode';
import { getIO } from '../socket';
import { randomBytes } from 'crypto';
import { Club } from '../models/Club.model';

// Tạo một trận đấu mới
export const createMatch = async (req: Request, res: Response): Promise<void> => {
    try {
        const { tableId, gameType, createdByMembershipId, isAiAssisted, teams } = req.body;

        const { manager } = req as any;
        const managerIdFromToken = manager ? manager.managerId : null;

        if (!tableId || !gameType || !teams || !Array.isArray(teams) || teams.length < 2) {
            res.status(400).json({
                success: false,
                message: 'Vui lòng cung cấp đủ thông tin: tableId, gameType, teams.'
            });
            return;
        }

        const table = await Table.findOne({ tableId: tableId });
        if (!table) {
            res.status(404).json({
                success: false,
                message: 'Không tìm thấy bàn chơi.'
            });
            return;
        }
        if (table.status == 'inuse') {
            res.status(409).json({
                success: false,
                message: 'Bàn này hiện đang được sử dụng.'
            });
            return;
        }

        if (table.status == 'maintenance') {
            res.status(409).json({
                success: false,
                message: 'Bàn này hiện đang được bảo trì.'
            });
            return;
        }

        let creatorMembership = null;
        if (createdByMembershipId) {
            creatorMembership = await Membership.findOne({ membershipId: createdByMembershipId });
            if (!creatorMembership) {
                res.status(400).json({ success: false, message: `Người tạo với ID ${createdByMembershipId} không tồn tại.` });
                return;
            }
            if (creatorMembership.status === 'inactive') {
                res.status(403).json({
                    success: false,
                    message: `Tài khoản hội viên của ${creatorMembership.fullName} đang bị cấm`
                });
                return;
            }

            const club = await Club.findOne({ clubId: table.clubId });
            if (club && creatorMembership.brandId !== club.brandId) {
                res.status(403).json({
                    success: false,
                    message: `Không tìm thấy hội viên.`
                });
                return;
            }
        }

        const processedTeams: IMatchTeam[] = [];
        for (const inputTeam of teams) {
            const processedMembers: IMatchTeamMember[] = [];
            if (inputTeam.members && Array.isArray(inputTeam.members)) {
                for (const member of inputTeam.members) {
                    if (member.phoneNumber) {
                        const foundMembership = await Membership.findOne({ phoneNumber: member.phoneNumber });
                        if (foundMembership) {
                            if (foundMembership.status === 'inactive') {
                                res.status(403).json({
                                    success: false,
                                    message: `Tài khoản hội viên của ${foundMembership.fullName} đang bị cấm`
                                });
                                return;
                            }

                            const club = await Club.findOne({ clubId: table.clubId });
                            if (club && foundMembership.brandId !== club.brandId) {
                                res.status(403).json({
                                    success: false,
                                    message: `Không tìm thấy hội viên`
                                });
                                return;
                            }

                            processedMembers.push({
                                membershipId: foundMembership.membershipId,
                                membershipName: foundMembership.fullName,
                            });
                        } else {
                            console.warn(`[createMatch] Membership with phone ${member.phoneNumber} not found. Treating as guest.`);
                            processedMembers.push({ guestName: `Guest ${member.phoneNumber}` });
                        }
                    }
                    else if (member.guestName) {
                        processedMembers.push({ guestName: member.guestName });
                    }
                }
            }
            processedTeams.push({
                teamName: inputTeam.teamName,
                score: 0,
                isWinner: false,
                members: processedMembers
            });
        }

        if (creatorMembership) {
            const isCreatorInTeam = processedTeams.some(team =>
                team.members.some(m => m.membershipId === creatorMembership.membershipId)
            );

            if (!isCreatorInTeam && processedTeams.length > 0) {
                processedTeams[0].members.unshift({
                    membershipId: creatorMembership.membershipId,
                    membershipName: creatorMembership.fullName,
                });
            }
        }

        const matchId = `MT-${Date.now()}`;
        let matchCode = '';
        let isCodeUnique = false;
        while (!isCodeUnique) {
            matchCode = generateMatchCode();
            const existingMatch = await Match.findOne({ matchCode });
            if (!existingMatch) {
                isCodeUnique = true;
            }
        };

        let guestToken: string | null = null;
        if (!createdByMembershipId && !managerIdFromToken) {
            guestToken = randomBytes(16).toString('hex');
        }

        const newMatch = new Match({
            matchId,
            tableId,
            gameType,
            isAiAssisted,
            teams: processedTeams,
            matchCode,
            createdByMembershipId: createdByMembershipId || null,
            creatorGuestToken: guestToken,
            managerId: managerIdFromToken,
            status: 'pending'
        });

        const savedMatch = await newMatch.save();
        await Table.findOneAndUpdate({ tableId: tableId }, { status: 'inuse' });

        res.status(201).json({
            success: true,
            data: savedMatch.toObject(),
            creatorGuestToken: guestToken
        });

    } catch (error: any) {
        console.error('Error creating match:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi tạo trận đấu', error: error.message });
    }
};

// Lấy thông tin chi tiết một trận đấu
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

// Lấy trận đấu theo mã
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

// Cập nhật điểm số cho một đội
export const updateScore = async (req: Request, res: Response): Promise<void> => {
    try {
        const { teamIndex, score } = req.body;
        const match = (req as any).match as IMatch;

        if (teamIndex === undefined || score === undefined) {
            res.status(400).json({
                success: false,
                message: 'Vui lòng cung cấp teamIndex và score.'
            });
            return;
        }

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

        match.teams[teamIndex].score = score;

        const updatedMatch = await match.save();

        getIO().to(updatedMatch.matchId).emit('match_updated', updatedMatch);

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

// Cập nhật thành viên trong đội
export const updateTeamMembers = async (req: Request, res: Response): Promise<void> => {
    try {
        const { teams } = req.body;
        const match = (req as any).match as IMatch;

        if (!req.body) {
            res.status(400).json({
                success: false,
                message: 'Request body không được cung cấp.'
            });
            return;
        }

        if (!teams || !Array.isArray(teams) || teams.length !== 2) {
            res.status(400).json({
                success: false,
                message: 'Teams phải là một mảng có 2 phần tử.'
            });
            return;
        }

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
                message: 'Không thể cập nhật thông tin trận đấu đã hoàn thành hoặc đã bị hủy.'
            });
            return;
        }

        for (let teamIndex = 0; teamIndex < 2; teamIndex++) {
            const rawMembers = teams[teamIndex];
            if (!rawMembers || !Array.isArray(rawMembers)) {
                res.status(400).json({
                    success: false,
                    message: `Members cho đội ${teamIndex} phải là một mảng.`
                });
                return;
            }

            const processedMembers: IMatchTeamMember[] = [];
            for (const member of rawMembers) {
                if (member.phoneNumber) {
                    const foundMembership = await Membership.findOne({ phoneNumber: member.phoneNumber });
                    if (foundMembership) {
                        if (foundMembership.status === 'inactive') {
                            res.status(403).json({
                                success: false,
                                message: `Tài khoản hội viên của ${foundMembership.fullName} đang bị cấm`
                            });
                            return;
                        }

                        const table = await Table.findOne({ tableId: match.tableId });
                        if (table) {
                            const club = await Club.findOne({ clubId: table.clubId });
                            if (club && foundMembership.brandId !== club.brandId) {
                                res.status(403).json({
                                    success: false,
                                    message: `Không tìm thấy hội viên.`
                                });
                                return;
                            }
                        }

                        processedMembers.push({
                            membershipId: foundMembership.membershipId,
                            membershipName: foundMembership.fullName,
                        });
                    } else {
                        console.warn(`Membership with phone ${member.phoneNumber} not found during team update.`);
                    }
                }
                else if (member.guestName) {
                    processedMembers.push({
                        guestName: member.guestName,
                    });
                }
            }

            match.teams[teamIndex].members = processedMembers;
        }

        const updatedMatch = await match.save();

        getIO().to(updatedMatch.matchId).emit('match_updated', updatedMatch);
        res.status(200).json({ success: true, data: updatedMatch });
    } catch (error: any) {
        console.error('Error updating both teams:', error);
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

// Bắt đầu trận đấu
export const startMatch = async (req: Request, res: Response): Promise<void> => {
    try {
        const match = (req as any).match as IMatch;

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

        const totalMembers = match.teams.reduce((total, team) => total + team.members.length, 0);
        if (totalMembers === 0) {
            res.status(400).json({
                success: false,
                message: 'Phải có ít nhất 1 người chơi để bắt đầu trận đấu.'
            });
            return;
        }

        for (let i = 0; i < match.teams.length; i++) {
            if (match.teams[i].members.length > 4) {
                res.status(400).json({
                    success: false,
                    message: `Team ${i + 1} chỉ được có tối đa 4 người chơi.`
                });
                return;
            }
        }

        if (totalMembers === 1) {
            let foundMember = null;
            let foundTeamIndex = -1;

            for (let i = 0; i < match.teams.length; i++) {
                if (match.teams[i].members.length > 0) {
                    foundMember = match.teams[i].members[0];
                    foundTeamIndex = i;
                    break;
                }
            }

            if (foundTeamIndex !== 0 && foundMember) {
                match.teams[foundTeamIndex].members = [];
                match.teams[0].members = [foundMember];
            }
        }

        match.status = 'ongoing';
        match.startTime = new Date();

        const updatedMatch = await match.save();

        getIO().to(updatedMatch.matchId).emit('match_updated', updatedMatch);

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

// Kết thúc trận đấu
export const endMatch = async (req: Request, res: Response): Promise<void> => {
    try {
        const match = (req as any).match as IMatch;

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

        let winningTeamIndex = -1;
        let highestScore = -1;

        match.teams.forEach((team, index) => {
            if (team.score > highestScore) {
                highestScore = team.score;
                winningTeamIndex = index;
            }
        });

        if (winningTeamIndex >= 0) {
            match.teams[winningTeamIndex].isWinner = true;
        }

        match.status = 'completed';
        match.endTime = new Date();

        const finishedMatch = await match.save();

        getIO().to(finishedMatch.matchId).emit('match_updated', finishedMatch);

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

// Xóa trận đấu
export const deleteMatch = async (req: Request, res: Response): Promise<void> => {
    try {
        const match = (req as any).match as IMatch;
        const matchIdToDelete = match.matchId;

        await Table.findOneAndUpdate({ tableId: match.tableId }, { status: 'empty' });

        await Match.deleteOne({ matchId: match.matchId });

        getIO().to(matchIdToDelete).emit('match_deleted', { matchId: matchIdToDelete, message: 'Trận đấu đã bị người tham gia hủy.' });

        res.status(200).json({
            success: true,
            message: 'Trận đấu đã được xóa thành công.'
        });
    } catch (error: any) {
        console.error('Error deleting match:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi xóa trận đấu',
            error: error.message
        });
    }
};

// Lấy danh sách trận đấu theo bàn
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

// Xác thực bàn chơi qua QR code
export const verifyTable = async (req: Request, res: Response): Promise<void> => {
    try {
        const { tableId } = req.body;

        if (!tableId) {
            res.status(400).json({
                success: false,
                message: 'Vui lòng cung cấp tableId.'
            });
            return;
        }

        const table = await Table.findOne({ tableId: tableId });
        if (!table) {
            res.status(404).json({
                success: false,
                message: 'Không tìm thấy bàn chơi.'
            });
            return;
        }

        res.status(200).json({
            success: true,
            data: {
                tableId: table.tableId,
                name: table.name,
                category: table.category,
                status: table.status,
                clubId: table.clubId
            }
        });
    } catch (error: any) {
        console.error('Error verifying table:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: error.message
        });
    }
};

//Xác thực membership
export const verifyMembership = async (req: Request, res: Response): Promise<void> => {
    try {
        const { phoneNumber } = req.body;

        if (!phoneNumber) {
            res.status(400).json({
                success: false,
                message: 'Vui lòng cung cấp số điện thoại.'
            });
            return;
        }

        const membership = await Membership.findOne({ phoneNumber });

        if (!membership) {
            res.status(200).json({
                success: true,
                isMember: false,
                message: 'Không tìm thấy hội viên, bạn có thể chơi với vai trò khách.'
            });
            return;
        }

        res.status(200).json({
            success: true,
            isMember: true,
            data: {
                membershipId: membership.membershipId,
                fullName: membership.fullName,
                phoneNumber: membership.phoneNumber,
                status: membership.status
            }
        });
    } catch (error: any) {
        console.error('Error verifying membership:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: error.message
        });
    }
};

// Tham gia trận đấu bằng mã code hoặc QR
export const joinMatch = async (req: Request, res: Response): Promise<void> => {
    try {
        const { matchCode, teamIndex = 0, joinerInfo } = req.body;

        if (!matchCode || !joinerInfo || (!joinerInfo.phoneNumber && !joinerInfo.guestName)) {
            res.status(400).json({ success: false, message: 'Vui lòng cung cấp matchCode và joinerInfo (phoneNumber hoặc guestName).' });
            return;
        }

        const match = await Match.findOne({ matchCode: matchCode });
        if (!match) {
            res.status(404).json({ success: false, message: 'Không tìm thấy trận đấu với mã này.' });
            return;
        }
        if (match.status !== 'pending') {
            res.status(400).json({ success: false, message: 'Chỉ có thể tham gia trận đấu đang ở trạng thái chờ.' });
            return;
        }
        if (teamIndex < 0 || teamIndex >= match.teams.length) {
            res.status(400).json({ success: false, message: 'Chỉ số đội không hợp lệ.' });
            return;
        }

        if (match.teams[teamIndex].members.length >= 4) {
            res.status(400).json({ success: false, message: `Team ${teamIndex + 1} đã đủ 4 người chơi.` });
            return;
        }

        let newMember: IMatchTeamMember;
        let isAlreadyJoined = false;

        if (joinerInfo.phoneNumber) {
            const membership = await Membership.findOne({ phoneNumber: joinerInfo.phoneNumber });
            if (!membership) {
                res.status(404).json({ success: false, message: `Không tìm thấy hội viên với SĐT ${joinerInfo.phoneNumber}.` });
                return;
            }
            if (membership.status === 'inactive') {
                res.status(403).json({
                    success: false,
                    message: `Tài khoản hội viên của ${membership.fullName} đang bị cấm`
                });
                return;
            }

            const table = await Table.findOne({ tableId: match.tableId });
            if (table) {
                const club = await Club.findOne({ clubId: table.clubId });
                if (club && membership.brandId !== club.brandId) {
                    res.status(403).json({
                        success: false,
                        message: `Không tìm thấy hội viên.`
                    });
                    return;
                }
            }

            isAlreadyJoined = match.teams.some(team => team.members.some(member => member.membershipId === membership.membershipId));
            newMember = { membershipId: membership.membershipId, membershipName: membership.fullName };
        } else {
            newMember = { guestName: joinerInfo.guestName };
        }

        if (isAlreadyJoined) {
            res.status(409).json({ success: false, message: 'Bạn đã tham gia trận đấu này rồi.' });
            return;
        }

        match.teams[teamIndex].members.push(newMember);
        const updatedMatch = await match.save();

        getIO().to(updatedMatch.matchId).emit('match_updated', updatedMatch);

        res.status(200).json({ success: true, data: updatedMatch, message: 'Tham gia trận đấu thành công.' });
    } catch (error: any) {
        console.error('Error joining match:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi tham gia trận đấu', error: error.message });
    }
};

// Rời khỏi trận đấu (chỉ áp dụng khi trận đấu chưa bắt đầu)
export const leaveMatch = async (req: Request, res: Response): Promise<void> => {
    try {
        const { matchCode, leaverInfo } = req.body;

        if (!matchCode || !leaverInfo || (!leaverInfo.phoneNumber && !leaverInfo.guestName)) {
            res.status(400).json({ success: false, message: 'Vui lòng cung cấp matchCode và leaverInfo (phoneNumber hoặc guestName).' });
            return;
        }

        const match = await Match.findOne({ matchCode: matchCode });
        if (!match) {
            res.status(404).json({ success: false, message: 'Không tìm thấy trận đấu với mã này.' });
            return;
        }

        if (match.status !== 'pending') {
            res.status(400).json({ success: false, message: 'Chỉ có thể rời khỏi trận đấu khi đang ở trạng thái chờ.' });
            return;
        }

        let memberToRemove: IMatchTeamMember | null = null;
        let teamIndex = -1;
        let memberIndex = -1;

        if (leaverInfo.phoneNumber) {
            for (let i = 0; i < match.teams.length; i++) {
                const foundMemberIndex = match.teams[i].members.findIndex(member =>
                    member.membershipId && member.membershipId === leaverInfo.phoneNumber
                );
                if (foundMemberIndex !== -1) {
                    const membership = await Membership.findOne({ membershipId: leaverInfo.phoneNumber });
                    if (membership) {
                        const table = await Table.findOne({ tableId: match.tableId });
                        if (table) {
                            const club = await Club.findOne({ clubId: table.clubId });
                            if (club && membership.brandId !== club.brandId) {
                                res.status(403).json({
                                    success: false,
                                    message: `Không tìm thấy hội viên.`
                                });
                                return;
                            }
                        }
                    }

                    memberToRemove = match.teams[i].members[foundMemberIndex];
                    teamIndex = i;
                    memberIndex = foundMemberIndex;
                    break;
                }
            }
        } else if (leaverInfo.guestName) {
            for (let i = 0; i < match.teams.length; i++) {
                const foundMemberIndex = match.teams[i].members.findIndex(member =>
                    member.guestName === leaverInfo.guestName
                );
                if (foundMemberIndex !== -1) {
                    memberToRemove = match.teams[i].members[foundMemberIndex];
                    teamIndex = i;
                    memberIndex = foundMemberIndex;
                    break;
                }
            }
        }

        if (!memberToRemove || teamIndex === -1) {
            res.status(404).json({ success: false, message: 'Không tìm thấy người chơi này trong trận đấu.' });
            return;
        }

        match.teams[teamIndex].members.splice(memberIndex, 1);

        const updatedMatch = await match.save();

        getIO().to(updatedMatch.matchId).emit('match_updated', updatedMatch);

        res.status(200).json({
            success: true,
            data: updatedMatch,
            message: 'Rời khỏi trận đấu thành công.'
        });
    } catch (error: any) {
        console.error('Error leaving match:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi rời khỏi trận đấu', error: error.message });
    }
};


export const getMatchHistory = async (req: Request, res: Response): Promise<void> => {
    try {
        const { membershipId } = req.params;
        const { limit = 10, page = 1 } = req.query;

        const query = {
            $or: [
                { createdByMembershipId: membershipId },
                { 'teams.members.membershipId': membershipId }
            ]
        };

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
        console.error('Error getting match history:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: error.message
        });
    }
};
