import { Server, Socket } from 'socket.io';

let io: Server;

export const initializeSocket = (serverIo: Server) => {
    io = serverIo;

    io.on('connection', (socket: Socket) => {
        console.log(`[Socket.IO] User connected: ${socket.id}`);

        socket.on('join_match_room', (matchId: string) => {
            if (matchId) {
                console.log(`[Socket.IO] User ${socket.id} is joining room for match ${matchId}`);
                socket.join(matchId);
            }
        });

        socket.on('leave_match_room', (matchId: string) => {
            if (matchId) {
                console.log(`[Socket.IO] User ${socket.id} is leaving room for match ${matchId}`);
                socket.leave(matchId);
            }
        });

        socket.on('disconnect', () => {
            console.log(`[Socket.IO] User disconnected: ${socket.id}`);
        });
    });
};

export const getIO = (): Server => {
    if (!io) {
        throw new Error("Socket.io not initialized!");
    }
    return io;
};