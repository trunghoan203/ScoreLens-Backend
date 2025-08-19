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
                            const isCreator = creatorMembership && foundMembership.membershipId === creatorMembership.membershipId;

                            processedMembers.push({
                                membershipId: foundMembership.membershipId,
                                membershipName: foundMembership.fullName,
                                role: isCreator ? 'host' : 'participant',
                                sessionToken: generateSessionToken(),
                            });
                        } else {
                            const phone = String(member.phoneNumber).trim();
                            processedMembers.push({
                                guestName: phone,              
                                role: 'participant',
                                sessionToken: generateSessionToken(),
                            });
                        }
                    }
                    else if (member.guestName) {
                        const g = String(member.guestName).trim().replace(/^Guest\s+/i, '');
                        processedMembers.push({
                            guestName: g,
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

        if (creatorMembership) {
            const isCreatorInTeam = processedTeams.some(team =>
                team.members.some(m => m.membershipId === creatorMembership.membershipId)
            );

            if (!isCreatorInTeam && processedTeams.length > 0) {
                processedTeams[0].members.unshift({
                    membershipId: creatorMembership.membershipId,
                    membershipName: creatorMembership.fullName,
                    role: 'host',
                    sessionToken: generateSessionToken(),
                });
            } else if (isCreatorInTeam) {
                for (const team of processedTeams) {
                    const creatorMember = team.members.find(m => m.membershipId === creatorMembership.membershipId);
                    if (creatorMember) {
                        creatorMember.role = 'host';
                        break;
                    }
                }
            }
        } else if (!createdByMembershipId && !managerIdFromToken) {
            if (processedTeams.length > 0 && processedTeams[0].members.length > 0) {
                const firstGuestMember = processedTeams[0].members[0];
                if (firstGuestMember.guestName) {
                    firstGuestMember.role = 'host';
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
            message: MESSAGES.MSG75,
            data: savedMatch.toObject(),
            creatorGuestToken: guestToken, 
            hostSessionToken: hostSessionToken 
        });

    } catch (error: any) {
        res.status(500).json({ success: false, message: MESSAGES.MSG100 });
    }
};

export const getMatchById = async (req: Request, res: Response): Promise<void> => {
    try {
        const match = await Match.findOne({ matchId: req.params.id });

        if (!match) {
            res.status(404).json({
                success: false,
                message: MESSAGES.MSG81
            });
            return;
        }

        res.status(200).json({
            success: true,
            data: match
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: MESSAGES.MSG100 });
    }
};

export const getMatchByCode = async (req: Request, res: Response): Promise<void> => {
    try {
        const { matchCode } = req.params;

        const match = await Match.findOne({ matchCode });

        if (!match) {
            res.status(404).json({
                success: false,
                message: MESSAGES.MSG81
            });
            return;
        }

        res.status(200).json({
            success: true,
            data: match
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: MESSAGES.MSG100 });
    }
};

export const updateScore = async (req: Request, res: Response): Promise<void> => {
    try {
        const { teamIndex, score } = req.body;
        const match = (req as any).match as IMatch;
        const matchMember = (req as any).matchMember; 

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

    if (!req.body) return void res.status(400).json({ success:false, message: MESSAGES.MSG120 });
    if (!Array.isArray(teams) || teams.length !== 2) return void res.status(400).json({ success:false, message: MESSAGES.MSG87 });
    if (!match) return void res.status(404).json({ success:false, message: MESSAGES.MSG81 });
    if (match.status === 'completed') return void res.status(400).json({ success:false, message: MESSAGES.MSG85 });

    const trim = (s:any) => typeof s === 'string' ? s.trim() : s;
    const normalizePhone = (s:string) => trim(s);
    const stripGuestPrefix = (s:string) => trim(s).replace(/^Guest\s+/i, '');

    const keyOf = (m: IMatchTeamMember) =>
      (m as any).membershipId ? `mem:${(m as any).membershipId}` :
      (m as any).guestName   ? `guest:${(m as any).guestName}` : '';

    let tableBrandId: string | undefined;
    const table = await Table.findOne({ tableId: match.tableId });
    if (table) {
      const club = await Club.findOne({ clubId: table.clubId });
      if (club) tableBrandId = club.brandId;
    }

    const existingByKey = new Map<string, { teamIndex:number; member:IMatchTeamMember }>();
    let hostKey: string | null = null;
    let hostTeamIndex = -1;
    let originalHost: IMatchTeamMember | null = null;

    match.teams.forEach((t, ti) => {
      t.members.forEach((m) => {
        const k = keyOf(m);
        if (!k) return;
        existingByKey.set(k, { teamIndex: ti, member: m });
        if (m.role === 'host') {
          hostKey = k;
          hostTeamIndex = ti;
          originalHost = m;
        }
      });
    });

    const managerCaller = (req as any).manager;
    if (!originalHost || hostKey === null) {
      if (!managerCaller) {
        return void res.status(400).json({ success:false, message: 'Dữ liệu không hợp lệ: không tìm thấy host hiện tại.' });
      }
    }

    let hostMembershipPhone: string | null = null;
    if (originalHost) {
      if ((originalHost as any).membershipId) {
        const hostMem = await Membership.findOne({ membershipId: (originalHost as any).membershipId });
        if (hostMem?.phoneNumber) hostMembershipPhone = normalizePhone(hostMem.phoneNumber);
      } else if ((originalHost as any).guestName) {
        hostMembershipPhone = normalizePhone((originalHost as any).guestName as string);
      }
    }

    const resolveIncoming = async (raw:any) => {
      if (raw.membershipId) {
        const mem = await Membership.findOne({ membershipId: raw.membershipId });
        if (!mem) return { error: 'Hội viên không tồn tại' };
        if (mem.status === 'inactive') return { error: `Tài khoản hội viên của ${mem.fullName} đang bị cấm` };
        if (tableBrandId && mem.brandId !== tableBrandId) return { error: MESSAGES.MSG61 };

        const k = `mem:${mem.membershipId}`;
        const isHost = !!(originalHost && (originalHost as any).membershipId && mem.membershipId === (originalHost as any).membershipId);
        return { key: isHost ? hostKey! : k, kind: 'membership', displayName: mem.fullName, membership: mem, isHost };
      }

      if (raw.phoneNumber) {
        const phone = normalizePhone(raw.phoneNumber);
        const mem = await Membership.findOne({ phoneNumber: phone });
        if (mem) {
          if (mem.status === 'inactive') return { error: `Tài khoản hội viên của ${mem.fullName} đang bị cấm` };
          if (tableBrandId && mem.brandId !== tableBrandId) return { error: MESSAGES.MSG61 };

          const k = `mem:${mem.membershipId}`;
          const isHost = !!(
            (originalHost && (originalHost as any).membershipId && mem.membershipId === (originalHost as any).membershipId) ||
            (!!hostMembershipPhone && phone === hostMembershipPhone)
          );
          return { key: isHost ? hostKey! : k, kind: 'membership', displayName: mem.fullName, membership: mem, isHost };
        }
        const isHost = !!hostMembershipPhone && phone === hostMembershipPhone;
        return { key: isHost ? hostKey! : `guest:${phone}`, kind: 'guest', displayName: phone, isHost };
      }

      if (raw.guestName) {
        const guestName = trim(raw.guestName);
        
        let mem = await Membership.findOne({ fullName: guestName });
        
        if (!mem) {
          const phone = normalizePhone(stripGuestPrefix(guestName));
          mem = await Membership.findOne({ phoneNumber: phone });
        }
        
        if (mem) {
          if (mem.status === 'inactive') return { error: `Tài khoản hội viên của ${mem.fullName} đang bị cấm` };
          if (tableBrandId && mem.brandId !== tableBrandId) return { error: MESSAGES.MSG61 };

          const k = `mem:${mem.membershipId}`;
          const isHost = !!(
            (originalHost && (originalHost as any).membershipId && mem.membershipId === (originalHost as any).membershipId) ||
            (!!hostMembershipPhone && mem.phoneNumber === hostMembershipPhone) ||
            (originalHost && mem.fullName === (originalHost as any).membershipName)
          );
          return { key: isHost ? hostKey! : k, kind: 'membership', displayName: mem.fullName, membership: mem, isHost };
        }
        
        const isHost = !!(originalHost && (originalHost as any).guestName && guestName === (originalHost as any).guestName);
        return { key: isHost ? hostKey! : `guest:${guestName}`, kind: 'guest', displayName: guestName, isHost };
      }

      return { error: 'Member input không hợp lệ' };
    };

    if ((!originalHost || hostKey === null) && managerCaller) {
      const newTeamsForManager = [
        { teamName: match.teams[0].teamName, members: [] as IMatchTeamMember[] },
        { teamName: match.teams[1].teamName, members: [] as IMatchTeamMember[] },
      ];

      let hostAssigned = false;
      const seenKeysMgr = new Set<string>();

      for (let ti = 0; ti < 2; ti++) {
        const inputArr = teams[ti];
        if (!Array.isArray(inputArr)) {
          return void res.status(400).json({ success:false, message: `Members cho đội ${ti} phải là một mảng.` });
        }
        for (const raw of inputArr) {
          const r:any = await resolveIncoming(raw);
          if (r?.error) return void res.status(403).json({ success:false, message: r.error });

          const key = r.key as string;
          if (seenKeysMgr.has(key)) {
            return void res.status(409).json({ success:false, message: MESSAGES.MSG79 });
          }
          seenKeysMgr.add(key);

          const existed = existingByKey.get(key)?.member;
          if (!hostAssigned) {
            if (existed) {
              newTeamsForManager[ti].members.push({ ...existed, role: 'host' });
            } else if (r.kind === 'membership') {
              newTeamsForManager[ti].members.push({
                membershipId: r.membership.membershipId,
                membershipName: r.displayName,
                role: 'host',
                sessionToken: generateSessionToken(),
                        });
                    } else {
              newTeamsForManager[ti].members.push({
                guestName: r.displayName,
                role: 'host',
                sessionToken: generateSessionToken(),
              });
            }
            hostAssigned = true;
          } else {
            if (existed) {
              newTeamsForManager[ti].members.push({ ...existed });
            } else if (r.kind === 'membership') {
              newTeamsForManager[ti].members.push({
                membershipId: r.membership.membershipId,
                membershipName: r.displayName,
                role: 'participant',
                sessionToken: generateSessionToken(),
              });
            } else {
              newTeamsForManager[ti].members.push({
                guestName: r.displayName,
                role: 'participant',
                sessionToken: generateSessionToken(),
              });
            }
          }
        }
      }

      if (!hostAssigned) {
        return void res.status(400).json({ success:false, message: 'Dữ liệu không hợp lệ: thiếu thành viên để gán host.' });
      }

      const seenMgr = new Set<string>();
      for (let ti = 0; ti < 2; ti++) {
        for (const m of newTeamsForManager[ti].members) {
          const k = keyOf(m);
          if (!k) continue;
          if (seenMgr.has(k)) return void res.status(409).json({ success:false, message: MESSAGES.MSG79 });
          seenMgr.add(k);
        }
      }

      match.teams[0].members = newTeamsForManager[0].members;
      match.teams[1].members = newTeamsForManager[1].members;

      const updatedMgr = await match.save();
      getIO().to(updatedMgr.matchId).emit('match_updated', updatedMgr);
      return void res.status(200).json({ success:true, data: updatedMgr });
    }

    const newTeams = [
      { teamName: match.teams[0].teamName, members: [] as IMatchTeamMember[] },
      { teamName: match.teams[1].teamName, members: [] as IMatchTeamMember[] },
    ];

    if (!originalHost) {
      return void res.status(500).json({ success:false, message: MESSAGES.MSG100 });
    }
    const originalHostMember = originalHost as IMatchTeamMember;
    newTeams[hostTeamIndex].members.push({
      membershipId: originalHostMember.membershipId,
      membershipName: originalHostMember.membershipName,
      guestName: originalHostMember.guestName,
      role: originalHostMember.role,
      sessionToken: originalHostMember.sessionToken,
    });

    const seenKeys = new Set<string>([hostKey!]); 
    for (let ti = 0; ti < 2; ti++) {
      const inputArr = teams[ti];
      if (!Array.isArray(inputArr)) {
        return void res.status(400).json({ success:false, message: `Members cho đội ${ti} phải là một mảng.` });
      }

      for (const raw of inputArr) {
        const r:any = await resolveIncoming(raw);
        if (r?.error) return void res.status(403).json({ success:false, message: r.error });

        const { key, kind, displayName, membership, isHost } = r;

        if (isHost || key === hostKey) continue;

        if (seenKeys.has(key)) {
          return void res.status(409).json({ success:false, message: MESSAGES.MSG79 });
        } 

        const existed = existingByKey.get(key)?.member;
        if (existed) {
          const keep: IMatchTeamMember = { ...existed };
          if (kind === 'membership') keep.membershipName = displayName;
          else keep.guestName = displayName;
          newTeams[ti].members.push(keep);
        } else {
          if (kind === 'membership') {
            newTeams[ti].members.push({
              membershipId: membership.membershipId,
              membershipName: displayName,
              role: 'participant',
              sessionToken: generateSessionToken(),
                        });
                    } else {
            newTeams[ti].members.push({
              guestName: displayName,
              role: 'participant',
              sessionToken: generateSessionToken(),
                        });
                    }
                }

        seenKeys.add(key);
      }
    }

    const hostCount =
      newTeams[0].members.filter(m => m.role === 'host').length +
      newTeams[1].members.filter(m => m.role === 'host').length;
    if (hostCount !== 1) {
      return void res.status(400).json({ success:false, message: 'Dữ liệu không hợp lệ: host bị trùng hoặc bị mất.' });
    }
    const seen = new Set<string>();
    for (let ti = 0; ti < 2; ti++) {
      for (const m of newTeams[ti].members) {
        const k = keyOf(m);
        if (!k) continue;
        if (seen.has(k)) return void res.status(409).json({ success:false, message: MESSAGES.MSG79 });
        seen.add(k);
      }
    }

    match.teams[0].members = newTeams[0].members;
    match.teams[1].members = newTeams[1].members;

    const updated = await match.save();
    getIO().to(updated.matchId).emit('match_updated', updated);

    res.status(200).json({ success:true, data: updated });
  } catch (e) {
    res.status(500).json({ success:false, message: MESSAGES.MSG100 });
    }
};

export const startMatch = async (req: Request, res: Response): Promise<void> => {
    try {
        const match = (req as any).match as IMatch;
        const matchMember = (req as any).matchMember; 

        if (!match) {
            res.status(404).json({
                success: false,
                message: MESSAGES.MSG81
            });
            return;
        }

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
            message: MESSAGES.MSG78,
            data: updatedMatch
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: MESSAGES.MSG100 });
    }
};

export const endMatch = async (req: Request, res: Response): Promise<void> => {
    try {
        const match = (req as any).match as IMatch;
        const matchMember = (req as any).matchMember; 

        if (!match) {
            res.status(404).json({
                success: false,
                message: MESSAGES.MSG81
            });
            return;
        }

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
            message: MESSAGES.MSG76,
            data: finishedMatch
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: MESSAGES.MSG100 });
    }
};

export const deleteMatch = async (req: Request, res: Response): Promise<void> => {
    try {
        const match = (req as any).match as IMatch;
        const matchMember = (req as any).matchMember; 

        if (!match) {
            res.status(404).json({
                success: false,
                message: 'Không tìm thấy trận đấu.'
            });
            return;
        }

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
            res.status(404).json({
                success: false,
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
            userSessionToken: newMember.sessionToken 
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

export const getUserSessionToken = async (req: Request, res: Response): Promise<void> => {
    try {
        const { matchId } = req.params;
        const { membershipId, guestName } = req.body;

        if (!membershipId && !guestName) {
            res.status(400).json({
                success: false,
                message: 'Cần cung cấp membershipId hoặc guestName'
            });
            return;
        }

        const match = await Match.findOne({ matchId });
        if (!match) {
            res.status(404).json({
                success: false,
                message: MESSAGES.MSG81
            });
            return;
        }
        
        let member = null;
        for (const team of match.teams) {
            member = team.members.find(m =>
                (membershipId && m.membershipId === membershipId) ||
                (guestName && m.guestName === guestName)
            );
            if (member) break;
        }

        if (!member) {
            res.status(404).json({
                success: false,
                message: 'Không tìm thấy user trong trận đấu này'
            });
            return;
        }

        res.status(200).json({
            success: true,
            data: {
                matchId: match.matchId,
                role: member.role,
                sessionToken: member.sessionToken,
                userInfo: {
                    membershipId: member.membershipId,
                    membershipName: member.membershipName,
                    guestName: member.guestName
                }
            }
        });

    } catch (error: any) {
        res.status(500).json({ success: false, message: MESSAGES.MSG100 });
    }
};
