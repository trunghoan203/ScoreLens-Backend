import dotenv from 'dotenv';
import app from './app';
import { connectDB } from './utils/db';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { initializeSocket } from './socket';

dotenv.config();

export const startServer = async () => {
    try {
        await connectDB(process.env.DB_URI);

        console.log('Kết nối cơ sở dữ liệu MongoDB đã được thiết lập thành công');

        const httpServer = http.createServer(app);
        const io = new SocketIOServer(httpServer, {
            path: '/socket.io',
            transports: ['websocket'],
            cors: {
                origin: process.env.ORIGIN?.split(',') || ["http://localhost:3000", "https://scorelens-omega.vercel.app"],
                methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
                allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
                credentials: true
            }
        });
        initializeSocket(io, httpServer);
        const PORT = process.env.PORT;
        httpServer.listen(PORT, () => {
            console.log(`Máy chủ đang lắng nghe trên cổng: http://localhost:${process.env.PORT} ....`);
        });
        
    } catch (error: any) {
        console.log('Lỗi kết nối MongoDB. Vui lòng đảm bảo MongoDB đang chạy.: ');
    }
};

startServer();

export default app;
