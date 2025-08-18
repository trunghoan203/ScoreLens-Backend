import { Server, Socket } from 'socket.io';
import { MESSAGES } from './config/messages';
import { Match } from './models/Match.model';

let io: Server;

export const initializeSocket = (serverIo: Server) => {
    io = serverIo;

    io.on('connection', (socket: Socket) => {
        console.log(`[Socket.IO] Người dùng đã kết nối: ${socket.id}`);

        // Authenticate match user với sessionToken
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

                // Tìm member với sessionToken
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

                // Lưu thông tin user vào socket data
                socket.data.matchId = data.matchId;
                socket.data.sessionToken = data.sessionToken;
                socket.data.role = member.role;
                socket.data.member = member;

                // Join match room
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

        // Join match room (legacy - giữ lại để tương thích)
        socket.on('join_match_room', (matchId: string) => {
            if (matchId) {
                console.log(`[Socket.IO] Người dùng ${socket.id} đang vào phòng ${matchId}`);
                socket.join(matchId);
            }
        });

        // Leave match room
        socket.on('leave_match_room', (matchId: string) => {
            if (matchId) {
                console.log(`[Socket.IO] Người dùng ${socket.id} đang rời phòng ${matchId}`);
                socket.leave(matchId);
            }
        });

        // Join role room for notifications
        socket.on('join_role_room', (data: { userId: string; role: string }) => {
            if (data.userId && data.role) {
                const roomName = `role_${data.role}`;
                const userRoomName = `user_${data.userId}`;
                
                console.log(`[Socket.IO] Người dùng ${data.userId} (${data.role}) tham gia phòng: ${roomName}, ${userRoomName}`);
                
                socket.join(roomName);
                socket.join(userRoomName);
                
                // Lưu thông tin user vào socket data
                socket.data.userId = data.userId;
                socket.data.role = data.role;
            }
        });

        // Leave role room
        socket.on('leave_role_room', (data: { userId: string; role: string }) => {
            if (data.userId && data.role) {
                const roomName = `role_${data.role}`;
                const userRoomName = `user_${data.userId}`;
                
                console.log(`[Socket.IO] Người dùng ${data.userId} (${data.role}) rời phòng: ${roomName}, ${userRoomName}`);
                socket.leave(roomName);
                socket.leave(userRoomName);
            }
        });

        // Handle notification read status
        socket.on('mark_notification_read', async (notificationId: string) => {
            try {
                if (socket.data.userId) {
                    // Emit event để client khác biết notification đã được đọc
                    socket.broadcast.emit('notification_read', {
                        notificationId,
                        userId: socket.data.userId
                    });
                }
            } catch (error) {
                console.error(MESSAGES.MSG100, error);
            }
        });

        // Handle typing indicators
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

        // Handle disconnect
        socket.on('disconnect', () => {
            console.log(`[Socket.IO] Người dùng đã ngắt kết nối: ${socket.id}`);
            
            // Clean up user data
            if (socket.data.userId && socket.data.role) {
                const roomName = `role_${socket.data.role}`;
                const userRoomName = `user_${socket.data.userId}`;
                
                socket.leave(roomName);
                socket.leave(userRoomName);
                
                console.log(`[Socket.IO] Dọn dẹp phòng cho người dùng ${socket.data.userId}`);
            }

            // Clean up match data
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

// Helper function để gửi thông báo cho user cụ thể
export const sendNotificationToUser = (userId: string, event: string, data: any) => {
    if (io) {
        io.to(`user_${userId}`).emit(event, data);
    }
};

// Helper function để gửi thông báo cho role cụ thể
export const sendNotificationToRole = (role: string, event: string, data: any) => {
    if (io) {
        io.to(`role_${role}`).emit(event, data);
    }
};

// Helper function để gửi thông báo cho tất cả
export const broadcastNotification = (event: string, data: any) => {
    if (io) {
        io.emit(event, data);
    }
};

// Helper function để gửi thông báo cho match room
export const sendNotificationToMatch = (matchId: string, event: string, data: any) => {
    if (io) {
        io.to(matchId).emit(event, data);
    }
};