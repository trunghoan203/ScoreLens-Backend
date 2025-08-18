import { Request, Response } from 'express';
import { Match, IMatchTeamMember, IMatch, IMatchTeam } from '../models/Match.model';
import { Table } from '../models/Table.model';
import { Membership } from '../models/Membership.model';
import { generateMatchCode, generateSessionToken } from '../utils/generateCode';
import { getIO } from '../socket';
import { randomBytes } from 'crypto';
import { Club } from '../models/Club.model';
import { MESSAGES } from '../config/messages';

export const createMatch = async (req: Request, res: Response): Promise<void> => {
    try {
        const { tableId, gameType, createdByMembershipId, isAiAssisted, teams } = req.body;

        const { manager } = req as any;
        const managerIdFromToken = manager ? manager.managerId : null;

        if (!tableId || !gameType || !teams || !Array.isArray(teams) || teams.length < 2) {
            res.status(400).json({
                success: false,
                message: MESSAGES.MSG46
            });
            return;
        }

        const table = await Table.findOne({ tableId: tableId });
        if (!table) {
            res.status(404).json({
                success: false,
                message: MESSAGES.MSG43
            });
            return;
        }

        if (table.status == 'inuse') {
            res.status(409).json({
                success: false,
                message: MESSAGES.MSG44
            });
            return;
        }

        if (table.status == 'maintenance') {
            res.status(409).json({
                success: false,
                message: MESSAGES.MSG45
            });
            return;
        }

        let creatorMembership = null;
        if (createdByMembershipId) {
            creatorMembership = await Membership.findOne({ membershipId: createdByMembershipId });
            if (!creatorMembership) {
                res.status(400).json({ success: false, message: MESSAGES.MSG80 });
                return;
            }
            if (creatorMembership.status === 'inactive') {
                res.status(403).json({
                    success: false,
                    message: MESSAGES.MSG82
                });
                return;
            }

            const club = await Club.findOne({ clubId: table.clubId });
            if (club) {
                if (creatorMembership.brandId !== club.brandId) {
                    res.status(403).json({
                        success: false,
                        message: MESSAGES.MSG83
                    });
                    return;
                }
            }
        }

        const processedTeams: IMatchTeam[] = [];
        for (const inputTeam of teams) {
            const processedMembers: IMatchTeamMember[] = [];
            if (inputTeam.members && Array.isArray(inputTeam.members)) {
                for (const member of inputTeam.members) {
                    if (member.phoneNumber) {
                        const club = await Club.findOne({ clubId: table.clubId });
                        let foundMembership = null;

                        if (club) {
                            foundMembership = await Membership.findOne({
                                phoneNumber: member.phoneNumber,
                                brandId: club.brandId
                            });
                        } else {
                            foundMembership = await Membership.findOne({ phoneNumber: member.phoneNumber });
                        }

                        if (foundMembership) {
                            if (foundMembership.status === 'inactive') {
                                res.status(403).json({
                                    success: false,
                                    message: MESSAGES.MSG82
                                });
                                return;
                            }

                            // Kiểm tra xem có phải người tạo trận đấu không
                            const isCreator = creatorMembership && foundMembership.membershipId === creatorMembership.membershipId;
                            
                            processedMembers.push({
                                membershipId: foundMembership.membershipId,
                                membershipName: foundMembership.fullName,
                                role: isCreator ? 'host' : 'participant', // Người tạo luôn là host
                                sessionToken: generateSessionToken(),
                            });
                        } else {
                            processedMembers.push({ 
                                guestName: `Guest ${member.phoneNumber}`,
                                role: 'participant',
                                sessionToken: generateSessionToken(),
                            });
                        }
                    }
                    else if (member.guestName) {
                        processedMembers.push({ 
                            guestName: member.guestName,
                            role: 'participant',
                            sessionToken: generateSessionToken(),
                        });
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

        // Đảm bảo người tạo LUÔN có role 'host'
        if (creatorMembership) {
            // Xử lý cho hội viên đã đăng ký
            const isCreatorInTeam = processedTeams.some(team =>
                team.members.some(m => m.membershipId === creatorMembership.membershipId)
            );

            if (!isCreatorInTeam && processedTeams.length > 0) {
                // Nếu người tạo chưa có trong teams, thêm vào team đầu tiên
                processedTeams[0].members.unshift({
                    membershipId: creatorMembership.membershipId,
                    membershipName: creatorMembership.fullName,
                    role: 'host',
                    sessionToken: generateSessionToken(),
                });
            } else if (isCreatorInTeam) {
                // Nếu người tạo đã có trong teams, cập nhật role thành 'host'
                for (const team of processedTeams) {
                    const creatorMember = team.members.find(m => m.membershipId === creatorMembership.membershipId);
                    if (creatorMember) {
                        creatorMember.role = 'host';
                        break;
                    }
                }
            }
        } else if (!createdByMembershipId && !managerIdFromToken) {
            // Xử lý cho guest user tạo trận đấu
            // Tìm guest user đầu tiên trong teams và gán role 'host'
            if (processedTeams.length > 0 && processedTeams[0].members.length > 0) {
                // Lấy guest user đầu tiên làm host
                const firstGuestMember = processedTeams[0].members[0];
                if (firstGuestMember.guestName) {
                    firstGuestMember.role = 'host';
                    console.log(`Guest user "${firstGuestMember.guestName}" được gán role 'host'`);
                }
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

        // Trả về sessionToken của host để Frontend sử dụng
        let hostSessionToken = null;
        for (const team of savedMatch.teams) {
            const hostMember = team.members.find(m => m.role === 'host');
            if (hostMember) {
                hostSessionToken = hostMember.sessionToken;
                break;
            }
        }

        res.status(201).json({
            success: true,
            data: savedMatch.toObject(),
            creatorGuestToken: guestToken,
            hostSessionToken: hostSessionToken // Thêm sessionToken của host
        });

    } catch (error: any) {
        res.status(500).json({ success: false, message: MESSAGES.MSG100 });
    }
};

export const getMatchById = async (req: Request, res: Response): Promise<void> => {
    try {
        const { membershipId, guestName } = req.query; // Thêm query params để xác định user
        const match = await Match.findOne({ matchId: req.params.id });

        if (!match) {
            res.status(404).json({
                success: false,
                message: MESSAGES.MSG81
            });
            return;
        }

        // Tìm sessionToken của user nếu có thông tin
        let userSessionToken = null;
        if (membershipId || guestName) {
            for (const team of match.teams) {
                const member = team.members.find(m => 
                    (membershipId && m.membershipId === membershipId) ||
                    (guestName && m.guestName === guestName)
                );
                if (member) {
                    userSessionToken = member.sessionToken;
                    break;
                }
            }
        }

        res.status(200).json({
            success: true,
            data: match,
            userSessionToken: userSessionToken // Trả về sessionToken của user
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: MESSAGES.MSG100 });
    }
};

export const getMatchByCode = async (req: Request, res: Response): Promise<void> => {
    try {
        const { matchCode } = req.params;
        const { membershipId, guestName } = req.query; // Thêm query params để xác định user

        const match = await Match.findOne({ matchCode });

        if (!match) {
            res.status(404).json({
                success: false,
                message: MESSAGES.MSG81
            });
            return;
        }

        // Tìm sessionToken của user nếu có thông tin
        let userSessionToken = null;
        if (membershipId || guestName) {
            for (const team of match.teams) {
                const member = team.members.find(m => 
                    (membershipId && m.membershipId === membershipId) ||
                    (guestName && m.guestName === guestName)
                );
                if (member) {
                    userSessionToken = member.sessionToken;
                    break;
                }
            }
        }

        res.status(200).json({
            success: true,
            data: match,
            userSessionToken: userSessionToken // Trả về sessionToken của user
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: MESSAGES.MSG100 });
    }
};

export const updateScore = async (req: Request, res: Response): Promise<void> => {
    try {
        const { teamIndex, score } = req.body;
        const match = (req as any).match as IMatch;
        const matchMember = (req as any).matchMember; // Lấy từ middleware

        if (teamIndex === undefined || score === undefined) {
            res.status(400).json({
                success: false,
                message: MESSAGES.MSG84
            });
            return;
        }

        if (!match) {
            res.status(404).json({
                success: false,
                message: MESSAGES.MSG81
            });
            return;
        }

        // Middleware requireHostRole đã kiểm tra quyền rồi
        // matchMember đã được xác thực là host

        if (match.status === 'completed') {
            res.status(400).json({
                success: false,
                message: MESSAGES.MSG85
            });
            return;
        }

        if (teamIndex < 0 || teamIndex >= match.teams.length) {
            res.status(400).json({
                success: false,
                message: MESSAGES.MSG86
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
        res.status(500).json({ success: false, message: MESSAGES.MSG100 });
    }
};

export const updateTeamMembers = async (req: Request, res: Response): Promise<void> => {
    try {
        const { teams } = req.body;
        const match = (req as any).match as IMatch;
        const matchMember = (req as any).matchMember; // Lấy từ middleware

        if (!req.body) {
            res.status(400).json({
                success: false,
                message: MESSAGES.MSG120
            });
            return;
        }

        if (!teams || !Array.isArray(teams) || teams.length !== 2) {
            res.status(400).json({
                success: false,
                message: MESSAGES.MSG87
            });
            return;
        }

        if (!match) {
            res.status(404).json({
                success: false,
                message: MESSAGES.MSG81
            });
            return;
        }

        // Middleware requireHostRole đã kiểm tra quyền rồi
        // matchMember đã được xác thực là host

        if (match.status === 'completed') {
            res.status(400).json({
                success: false,
                message: MESSAGES.MSG85
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
                                    message: MESSAGES.MSG61
                                });
                                return;
                            }
                        }

                        // Kiểm tra xem member này có phải là host không
                        const isHost = foundMembership.membershipId === match.createdByMembershipId;
                        
                        // Nếu không phải host, kiểm tra xem có phải là guest host không
                        let finalRole: 'host' | 'participant' = isHost ? 'host' : 'participant';
                        if (!isHost && !match.createdByMembershipId && match.creatorGuestToken) {
                            // Trường hợp host là guest user
                            const isGuestHost = member.phoneNumber && match.creatorGuestToken.includes(member.phoneNumber.slice(-6));
                            if (isGuestHost) {
                                finalRole = 'host';
                            }
                        }
                        
                        // Tìm member hiện tại trong team để giữ nguyên token nếu có
                        const existingMember = match.teams[teamIndex].members.find(m => 
                            m.membershipId === foundMembership.membershipId
                        );

                        processedMembers.push({
                            membershipId: foundMembership.membershipId,
                            membershipName: foundMembership.fullName,
                            role: finalRole,
                            sessionToken: existingMember ? existingMember.sessionToken : generateSessionToken(),
                        });
                    } else {
                        // Tìm guest member hiện tại để giữ nguyên token nếu có
                        const existingGuestMember = match.teams[teamIndex].members.find(m => 
                            m.guestName === `Guest ${member.phoneNumber}`
                        );

                        // Kiểm tra xem có phải là guest host không
                        let guestRole: 'host' | 'participant' = 'participant';
                        if (!match.createdByMembershipId && match.creatorGuestToken) {
                            const isGuestHost = match.creatorGuestToken.includes(member.phoneNumber.slice(-6));
                            if (isGuestHost) {
                                guestRole = 'host';
                            }
                        }

                        processedMembers.push({
                            guestName: `Guest ${member.phoneNumber}`,
                            role: guestRole,
                            sessionToken: existingGuestMember ? existingGuestMember.sessionToken : generateSessionToken(),
                        });
                    }
                }
                else if (member.guestName) {
                    // Tìm guest member hiện tại để giữ nguyên token nếu có
                    const existingGuestMember = match.teams[teamIndex].members.find(m => 
                        m.guestName === member.guestName
                    );

                    // Kiểm tra xem có phải là guest host không
                    let guestNameRole: 'host' | 'participant' = 'participant';
                    if (!match.createdByMembershipId && match.creatorGuestToken) {
                        const isGuestHost = match.creatorGuestToken.includes(member.guestName.slice(-6));
                        if (isGuestHost) {
                            guestNameRole = 'host';
                        }
                    }

                    processedMembers.push({
                        guestName: member.guestName,
                        role: guestNameRole,
                        sessionToken: existingGuestMember ? existingGuestMember.sessionToken : generateSessionToken(),
                    });
                }
            }

            match.teams[teamIndex].members = processedMembers;
        }

        const updatedMatch = await match.save();

        getIO().to(updatedMatch.matchId).emit('match_updated', updatedMatch);

        // Trả về sessionToken của host để Frontend sử dụng
        let hostSessionToken = null;
        for (const team of updatedMatch.teams) {
            const hostMember = team.members.find(m => m.role === 'host');
            if (hostMember) {
                hostSessionToken = hostMember.sessionToken;
                break;
            }
        }

        res.status(200).json({ 
            success: true, 
            data: updatedMatch,
            hostSessionToken: hostSessionToken // Thêm sessionToken của host
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: MESSAGES.MSG100 });
    }
};

export const startMatch = async (req: Request, res: Response): Promise<void> => {
    try {
        const match = (req as any).match as IMatch;
        const matchMember = (req as any).matchMember; // Lấy từ middleware

        if (!match) {
            res.status(404).json({
                success: false,
                message: MESSAGES.MSG81
            });
            return;
        }

        // Middleware requireHostRole đã kiểm tra quyền rồi
        // matchMember đã được xác thực là host

        if (match.status !== 'pending') {
            res.status(400).json({
                success: false,
                message: MESSAGES.MSG85
            });
            return;
        }

        const totalMembers = match.teams.reduce((total, team) => total + team.members.length, 0);
        if (totalMembers === 0) {
            res.status(400).json({
                success: false,
                message: MESSAGES.MSG87
            });
            return;
        }

        for (let i = 0; i < match.teams.length; i++) {
            if (match.teams[i].members.length > 4) {
                res.status(400).json({
                    success: false,
                    message: MESSAGES.MSG87
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
        res.status(500).json({ success: false, message: MESSAGES.MSG100 });
    }
};

export const endMatch = async (req: Request, res: Response): Promise<void> => {
    try {
        const match = (req as any).match as IMatch;
        const matchMember = (req as any).matchMember; // Lấy từ middleware

        if (!match) {
            res.status(404).json({
                success: false,
                message: MESSAGES.MSG81
            });
            return;
        }

        // Middleware requireHostRole đã kiểm tra quyền rồi
        // matchMember đã được xác thực là host

        if (match.status === 'completed') {
            res.status(400).json({
                success: false,
                message: MESSAGES.MSG88
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
        getIO().to(finishedMatch.matchId).emit('match_ended', {
            matchId: finishedMatch.matchId,
            data: finishedMatch,
        });

        await Table.findOneAndUpdate({ tableId: match.tableId }, { status: 'empty' });

        res.status(200).json({
            success: true,
            data: finishedMatch
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: MESSAGES.MSG100 });
    }
};

export const deleteMatch = async (req: Request, res: Response): Promise<void> => {
    try {
        const match = (req as any).match as IMatch;
        const matchMember = (req as any).matchMember; // Lấy từ middleware

        if (!match) {
            res.status(404).json({
                success: false,
                message: 'Không tìm thấy trận đấu.'
            });
            return;
        }

        // Middleware requireHostRole đã kiểm tra quyền rồi
        // matchMember đã được xác thực là host

        const matchIdToDelete = match.matchId;

        await Table.findOneAndUpdate({ tableId: match.tableId }, { status: 'empty' });

        await Match.deleteOne({ matchId: match.matchId });

        getIO().to(matchIdToDelete).emit('match_deleted', { matchId: matchIdToDelete, message: 'Trận đấu đã bị người tạo hủy.' });

        res.status(200).json({
            success: true,
            message: MESSAGES.MSG89
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: MESSAGES.MSG100 });
    }
};

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
        res.status(500).json({ success: false, message: MESSAGES.MSG100 });
    }
};

export const verifyTable = async (req: Request, res: Response): Promise<void> => {
    try {
        const { tableId } = req.body;

        if (!tableId) {
            res.status(400).json({
                success: false,
                message: MESSAGES.MSG46
            });
            return;
        }

        const table = await Table.findOne({ tableId: tableId });
        if (!table) {
            res.status(404).json({
                success: false,
                message: MESSAGES.MSG43
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
        res.status(500).json({ success: false, message: MESSAGES.MSG100 });
    }
};

export const verifyMembership = async (req: Request, res: Response): Promise<void> => {
    try {
        const { phoneNumber, clubId } = req.body;

        if (!phoneNumber || !clubId) {
            res.status(400).json({
                success: false,
                message: MESSAGES.MSG46 
            });
            return;
        }

        const membership = await Membership.findOne({ phoneNumber });

        if (!membership) {
            res.status(200).json({
                success: true,
                isMember: false,
                message: MESSAGES.MSG61
            });
            return;
        }

        const club = await Club.findOne({ clubId: clubId });
        if (!club) {
            res.status(404).json({
                success: false,
                message: MESSAGES.MSG60
            });
            return;
        }

        if (membership.brandId !== club.brandId) {
            res.status(403).json({
                success: false,
                isMember: true,
                isBrandCompatible: false,
                message: MESSAGES.MSG83,
                data: {
                    membershipId: membership.membershipId,
                    fullName: membership.fullName,
                    phoneNumber: membership.phoneNumber,
                    status: membership.status,
                    brandId: membership.brandId
                }
            });
            return;
        }

        res.status(200).json({
            success: true,
            isMember: true,
            isBrandCompatible: true,
            message: MESSAGES.MSG63,
            data: {
                membershipId: membership.membershipId,
                fullName: membership.fullName,
                phoneNumber: membership.phoneNumber,
                status: membership.status,
                brandId: membership.brandId
            }
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: MESSAGES.MSG100 });
    }
};

export const joinMatch = async (req: Request, res: Response): Promise<void> => {
    try {
        const { matchCode, teamIndex = 0, joinerInfo } = req.body;

        if (!matchCode || !joinerInfo) {
            res.status(400).json({ 
                success: false, 
                message: MESSAGES.MSG84 
            });
            return;
        }

        const hasValidInfo = (
            (joinerInfo.membershipId && joinerInfo.membershipName) ||
            joinerInfo.phoneNumber ||
            joinerInfo.guestName
        );

        if (!hasValidInfo) {
            res.status(400).json({ 
                success: false, 
                message: MESSAGES.MSG46
            });
            return;
        }

        const match = await Match.findOne({ matchCode: matchCode });
        if (!match) {
            res.status(404).json({ success: false, message: MESSAGES.MSG81 });
            return;
        }
        if (match.status !== 'pending') {
            res.status(400).json({ success: false, message: MESSAGES.MSG85 });
            return;
        }
        if (teamIndex < 0 || teamIndex >= match.teams.length) {
            res.status(400).json({ success: false, message: MESSAGES.MSG86 });
            return;
        }

        if (match.teams[teamIndex].members.length >= 4) {
            res.status(400).json({ success: false, message: `Team ${teamIndex + 1} đã đủ 4 người chơi.` });
            return;
        }

        let newMember: IMatchTeamMember;
        let isAlreadyJoined = false;

        if (joinerInfo.membershipId && joinerInfo.membershipName) {
            newMember = { 
                membershipId: joinerInfo.membershipId, 
                membershipName: joinerInfo.membershipName,
                role: 'participant',
                sessionToken: generateSessionToken(),
            };
            
            isAlreadyJoined = match.teams.some(team => 
                team.members.some(member => member.membershipId === joinerInfo.membershipId)
            );
            
        } else if (joinerInfo.phoneNumber) {
            const membership = await Membership.findOne({ phoneNumber: joinerInfo.phoneNumber });
            if (!membership) {
                res.status(404).json({ success: false, message: MESSAGES.MSG61 });
                return;
            }
            if (membership.status === 'inactive') {
                res.status(403).json({
                    success: false,
                    message: MESSAGES.MSG82
                });
                return;
            }

            const table = await Table.findOne({ tableId: match.tableId });
            if (table) {
                const club = await Club.findOne({ clubId: table.clubId });
                if (club && membership.brandId !== club.brandId) {
                    res.status(403).json({
                        success: false,
                        message: MESSAGES.MSG61
                    });
                    return;
                }
            }

            isAlreadyJoined = match.teams.some(team => 
                team.members.some(member => member.membershipId === membership.membershipId)
            );
            newMember = { 
                membershipId: membership.membershipId, 
                membershipName: membership.fullName,
                role: 'participant',
                sessionToken: generateSessionToken(),
            };
            
        } else if (joinerInfo.guestName) {
            newMember = { 
                guestName: joinerInfo.guestName,
                role: 'participant',
                sessionToken: generateSessionToken(),
            };
            
            isAlreadyJoined = match.teams.some(team => 
                team.members.some(member => 
                    member.guestName === joinerInfo.guestName
                )
            );
        } else {
            res.status(400).json({ 
                success: false, 
                message: MESSAGES.MSG46
            });
            return;
        }

        if (isAlreadyJoined) {
            res.status(409).json({ success: false, message: MESSAGES.MSG79 });
            return;
        }

        match.teams[teamIndex].members.push(newMember);
        const updatedMatch = await match.save();

        getIO().to(updatedMatch.matchId).emit('match_updated', updatedMatch);


        res.status(200).json({ 
            success: true, 
            data: updatedMatch, 
            message: 'Tham gia trận đấu thành công.',
            userSessionToken: newMember.sessionToken // Trả về sessionToken của user mới join
        });

    } catch (error: any) {
        res.status(500).json({ success: false, message: MESSAGES.MSG100 });
    }
};

export const leaveMatch = async (req: Request, res: Response): Promise<void> => {
    try {
        const { matchCode, leaverInfo } = req.body;

        if (!matchCode || !leaverInfo) {
            res.status(400).json({ 
                success: false, 
                message: MESSAGES.MSG84
            });
            return;
        }

        const hasValidInfo = (
            (leaverInfo.membershipId && leaverInfo.membershipName) ||
            leaverInfo.phoneNumber ||
            leaverInfo.guestName
        );

        if (!hasValidInfo) {
            res.status(400).json({ 
                success: false, 
                message: MESSAGES.MSG46
            });
            return;
        }

        const match = await Match.findOne({ matchCode: matchCode });
        if (!match) {
            res.status(404).json({ success: false, message: MESSAGES.MSG81 });
            return;
        }

        if (match.status !== 'pending') {
            res.status(400).json({ success: false, message: MESSAGES.MSG77 });
            return;
        }

        let memberToRemove: IMatchTeamMember | null = null;
        let teamIndex = -1;
        let memberIndex = -1;

        if (leaverInfo.membershipId && leaverInfo.membershipName) {
            for (let i = 0; i < match.teams.length; i++) {
                const foundMemberIndex = match.teams[i].members.findIndex(member =>
                    member.membershipId === leaverInfo.membershipId
                );
                if (foundMemberIndex !== -1) {
                    memberToRemove = match.teams[i].members[foundMemberIndex];
                    teamIndex = i;
                    memberIndex = foundMemberIndex;
                    break;
                }
            }
            
        } else if (leaverInfo.phoneNumber) {
            const membership = await Membership.findOne({ phoneNumber: leaverInfo.phoneNumber });
            if (!membership) {
                res.status(404).json({ 
                    success: false, 
                    message: MESSAGES.MSG61 
                });
                return;
            }

            const table = await Table.findOne({ tableId: match.tableId });
            if (table) {
                const club = await Club.findOne({ clubId: table.clubId });
                if (club && membership.brandId !== club.brandId) {
                    res.status(403).json({
                        success: false,
                        message: MESSAGES.MSG61
                    });
                    return;
                }
            }

            for (let i = 0; i < match.teams.length; i++) {
                const foundMemberIndex = match.teams[i].members.findIndex(member =>
                    member.membershipId === membership.membershipId
                );
                if (foundMemberIndex !== -1) {
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
            res.status(404).json({ success: false, message: MESSAGES.MSG61 });
            return;
        }

        match.teams[teamIndex].members.splice(memberIndex, 1);

        const updatedMatch = await match.save();

        getIO().to(updatedMatch.matchId).emit('match_updated', updatedMatch);

        res.status(200).json({
            success: true,
            data: updatedMatch,
            message: MESSAGES.MSG76
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: MESSAGES.MSG100 });
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
        res.status(500).json({ success: false, message: MESSAGES.MSG100 });
    }
};

// API mới để Frontend lấy sessionToken của mình
export const getUserSessionToken = async (req: Request, res: Response): Promise<void> => {
    try {
        const { matchId } = req.params;
        const { membershipId, guestName } = req.body;

        if (!matchId) {
            res.status(400).json({
                success: false,
                message: 'Vui lòng cung cấp matchId.'
            });
            return;
        }

        if (!membershipId && !guestName) {
            res.status(400).json({
                success: false,
                message: 'Vui lòng cung cấp membershipId hoặc guestName.'
            });
            return;
        }

        const match = await Match.findOne({ matchId });
        if (!match) {
            res.status(404).json({
                success: false,
                message: 'Không tìm thấy trận đấu.'
            });
            return;
        }

        // Tìm sessionToken của user
        let userSessionToken = null;
        let userRole = null;
        let userName = null;

        for (const team of match.teams) {
            const member = team.members.find(m => 
                (membershipId && m.membershipId === membershipId) ||
                (guestName && m.guestName === guestName)
            );
            if (member) {
                userSessionToken = member.sessionToken;
                userRole = member.role;
                userName = member.membershipName || member.guestName;
                break;
            }
        }

        if (!userSessionToken) {
            res.status(404).json({
                success: false,
                message: 'Không tìm thấy thông tin người dùng trong trận đấu này.'
            });
            return;
        }

        res.status(200).json({
            success: true,
            data: {
                sessionToken: userSessionToken,
                role: userRole,
                userName: userName,
                matchId: matchId
            }
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: MESSAGES.MSG100 });
    }
};
