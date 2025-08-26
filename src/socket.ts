import { Server, Socket } from 'socket.io';
import { MESSAGES } from './config/messages';
import { Match } from './models/Match.model';
import { Camera } from './models/Camera.model';
import { spawn } from 'child_process';
import WebSocket from 'ws';
import { URL } from 'url';

let io: Server;
let wss: WebSocket.Server;
const activeRawStreams = new Map<string, any>();

export const initializeSocket = (serverIo: Server, httpServer: any) => {
    io = serverIo;

    wss = new WebSocket.Server({
        noServer: true,
        perMessageDeflate: false,
    });

    wss.on('connection', (ws: WebSocket, req: any) => {
        const url = new URL(req.url, 'http://localhost');
        const cameraId = url.searchParams.get('cameraId') || 'unknown';
        
                    if (!cameraId || cameraId === 'unknown') {
                ws.close();
                return;
            }

        Camera.findOne({ cameraId }).then(camera => {
            if (!camera) {
                ws.close();
                return;
            }

            const rtspUrl = `rtsp://${camera.username}:${camera.password}@${camera.IPAddress}:554/cam/realmonitor?channel=1&subtype=0`;

            const ffmpegArgs = [
                '-rtsp_transport', 'tcp',
                '-fflags', 'nobuffer',
                '-flags', 'low_delay',
                '-avioflags', 'direct',
                '-timeout', '5000000',
                '-i', rtspUrl,

                '-f', 'mpegts',
                '-codec:v', 'mpeg1video',
                '-r', '25',
                '-b:v', '1500k',
                '-g', '25',
                '-bf', '0',
                '-pix_fmt', 'yuv420p',
                '-an',
                '-tune', 'zerolatency',
                '-flush_packets', '1',
                '-muxdelay', '0',
                '-muxpreload', '0',
                '-mpegts_flags', '+resend_headers',

                'pipe:1',
            ];
            
            let ffmpeg;
            try {
                ffmpeg = spawn('ffmpeg', ffmpegArgs);
            } catch (e) {
                ws.close(1011, 'ffmpeg spawn error');
                return;
            }

            activeRawStreams.set(cameraId, ffmpeg);

            const pingInterval = setInterval(() => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.ping();
                } else {
                    clearInterval(pingInterval);
                }
            }, 15000);

            ffmpeg.stdout.on('data', (data) => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(data);
                }
            });

            ffmpeg.stderr.on('data', (data) => {
                // Silent FFmpeg stderr
            });

            ffmpeg.on('close', (code, signal) => {
                console.log(`[FFMPEG] ${cameraId} exit code=${code} signal=${signal}`);
                if (ws.readyState === WebSocket.OPEN) {
                    ws.close(1011, 'ffmpeg closed');
                }
                activeRawStreams.delete(cameraId);
                clearInterval(pingInterval);
            });

            ffmpeg.on('error', (error) => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.close(1011, 'ffmpeg error');
                }
                activeRawStreams.delete(cameraId);
                clearInterval(pingInterval);
            });

            const close = () => {
                clearInterval(pingInterval);
                try { 
                    ffmpeg.kill('SIGINT'); 
                    activeRawStreams.delete(cameraId);
                } catch {}
                console.log(`[Raw WebSocket] ${cameraId} client closed`);
            };

            ws.on('close', close);
            ws.on('error', (e) => {
                close();
            });

        }).catch(error => {
            ws.close();
        });
    });

    httpServer.on('upgrade', (request: any, socket: any, head: any) => {
        const { pathname } = new URL(request.url, 'http://localhost');
        
        if (pathname === '/api/stream') {
            wss.handleUpgrade(request, socket, head, (ws) => {
                wss.emit('connection', ws, request);
            });
            return;
        }
        
    });

    io.on('connection', (socket: Socket) => {
        console.log(`[Socket.IO] Người dùng đã kết nối: ${socket.id}`);

        socket.on('authenticate_match', async (data: { matchId: string; sessionToken: string }) => {
            try {
                if (!data.matchId || !data.sessionToken) {
                    socket.emit('auth_result', { 
                        success: false, 
                        message: 'Thiếu thông tin xác thực' 
                    });
                    return;
                }

                const match = await Match.findOne({ matchId: data.matchId });
                
                if (!match) {
                    socket.emit('auth_result', { 
                        success: false, 
                        message: 'Không tìm thấy trận đấu' 
                    });
                    return;
                }

                let member = null;
                for (const team of match.teams) {
                    member = team.members.find(m => m.sessionToken === data.sessionToken);
                    if (member) break;
                }

                if (!member) {
                    socket.emit('auth_result', { 
                        success: false, 
                        message: 'SessionToken không hợp lệ' 
                    });
                    return;
                }

                socket.data.matchId = data.matchId;
                socket.data.sessionToken = data.sessionToken;
                socket.data.role = member.role;
                socket.data.member = member;

                socket.join(data.matchId);

                socket.emit('auth_result', { 
                    success: true, 
                    role: member.role,
                    message: 'Xác thực thành công',
                    userInfo: {
                        name: member.membershipName || member.guestName,
                        role: member.role
                    }
                });


            } catch (error) {
                console.error('[Socket.IO] Lỗi xác thực:', error);
                socket.emit('auth_result', { 
                    success: false, 
                    message: 'Lỗi xác thực' 
                });
            }
        });

        socket.on('join_match_room', (matchId: string) => {
            if (matchId) {
                console.log(`[Socket.IO] Người dùng ${socket.id} đang vào phòng ${matchId}`);
                socket.join(matchId);
            }
        });

        socket.on('leave_match_room', (matchId: string) => {
            if (matchId) {
                console.log(`[Socket.IO] Người dùng ${socket.id} đang rời phòng ${matchId}`);
                socket.leave(matchId);
            }
        });

        socket.on('token_invalidated', (data: { sessionToken: string; message: string }) => {
            if (socket.data.sessionToken === data.sessionToken) {
                console.log(`[Socket.IO] Token bị invalidate cho socket ${socket.id}`);
                socket.emit('token_invalidated', {
                    success: false,
                    message: data.message,
                    code: 'TOKEN_INVALIDATED'
                });
                
                socket.disconnect();
            }
        });

        socket.on('join_role_room', (data: { userId: string; role: string }) => {
            if (data.userId && data.role) {
                const roomName = `role_${data.role}`;
                const userRoomName = `user_${data.userId}`;
                
                console.log(`[Socket.IO] Người dùng ${data.userId} (${data.role}) tham gia phòng: ${roomName}, ${userRoomName}`);
                
                socket.join(roomName);
                socket.join(userRoomName);
                
                socket.data.userId = data.userId;
                socket.data.role = data.role;
            }
        });

        socket.on('leave_role_room', (data: { userId: string; role: string }) => {
            if (data.userId && data.role) {
                const roomName = `role_${data.role}`;
                const userRoomName = `user_${data.userId}`;
                
                console.log(`[Socket.IO] Người dùng ${data.userId} (${data.role}) rời phòng: ${roomName}, ${userRoomName}`);
                socket.leave(roomName);
                socket.leave(userRoomName);
            }
        });

        socket.on('mark_notification_read', async (notificationId: string) => {
            try {
                if (socket.data.userId) {
                    socket.broadcast.emit('notification_read', {
                        notificationId,
                        userId: socket.data.userId
                    });
                }
            } catch (error) {
                console.error(MESSAGES.MSG100, error);
            }
        });

        socket.on('typing_start', (data: { matchId: string; userId: string; userName: string }) => {
            if (data.matchId) {
                socket.to(data.matchId).emit('user_typing', {
                    userId: data.userId,
                    userName: data.userName,
                    isTyping: true
                });
            }
        });

        socket.on('typing_stop', (data: { matchId: string; userId: string }) => {
            if (data.matchId) {
                socket.to(data.matchId).emit('user_typing', {
                    userId: data.userId,
                    isTyping: false
                });
            }
        });

        socket.on('disconnect', () => {
            console.log(`[Socket.IO] Người dùng đã ngắt kết nối: ${socket.id}`);
            
            if (socket.data.userId && socket.data.role) {
                const roomName = `role_${socket.data.role}`;
                const userRoomName = `user_${socket.data.userId}`;
                
                socket.leave(roomName);
                socket.leave(userRoomName);
                
                console.log(`[Socket.IO] Dọn dẹp phòng cho người dùng ${socket.data.userId}`);
            }

            if (socket.data.matchId) {
                socket.leave(socket.data.matchId);
                console.log(`[Socket.IO] Dọn dẹp phòng trận đấu ${socket.data.matchId}`);
            }


        });


    });
};

export const getIO = (): Server => {
    if (!io) {
        throw new Error("Socket.io chưa được khởi tạo!");
    }
    return io;
};

export const sendNotificationToUser = (userId: string, event: string, data: any) => {
    if (io) {
        io.to(`user_${userId}`).emit(event, data);
    }
};

export const sendNotificationToRole = (role: string, event: string, data: any) => {
    if (io) {
        io.to(`role_${role}`).emit(event, data);
    }
};

export const broadcastNotification = (event: string, data: any) => {
    if (io) {
        io.emit(event, data);
    }
};

export const sendNotificationToMatch = (matchId: string, event: string, data: any) => {
    if (io) {
        io.to(matchId).emit(event, data);
    }
};