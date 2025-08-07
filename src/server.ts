import dotenv from 'dotenv';
import app from './app';
import { connectDB } from './utils/db';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { initializeSocket } from './socket';

dotenv.config();

// Connecting to MongoDB and Starting Server
export const startServer = async () => {
    try {
        await connectDB(process.env.DB_URI);

        console.log('MongoDB database connection established successfully');

        const httpServer = http.createServer(app);
        const io = new SocketIOServer(httpServer, {
            cors: {
                origin: process.env.ORIGIN?.split(',') || ["http://localhost:3000", "https://scorelens-backend.onrender.com"],
                methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
                allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
                credentials: true
            }
        });
        initializeSocket(io);
        const PORT = process.env.PORT;
        httpServer.listen(PORT, () => {
            console.log(`Server is listening on port: http://localhost:${process.env.PORT} ....`);
        });
        
    } catch (error: any) {
        console.log('MongoDB connection error. Please make sure MongoDB is running: ');
    }
};

// Establish http server connection
startServer();

export default app;
