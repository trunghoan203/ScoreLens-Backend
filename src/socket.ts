import { Server, Socket } from 'socket.io';
import { MESSAGES } from './config/messages';

let io: Server;

export const initializeSocket = (serverIo: Server) => {
    io = serverIo;

    io.on('connection', (socket: Socket) => {
        console.log(`[Socket.IO] Người dùng đã kết nối: ${socket.id}`);

        // Join match room
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