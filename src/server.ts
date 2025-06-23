import dotenv from 'dotenv';
import app from './app';
import { connectDB } from './utils/db';

dotenv.config();

// Connecting to MongoDB and Starting Server
export const startServer = async () => {
    try {
        await connectDB(process.env.DB_URI);

        console.log('MongoDB database connection established successfully');

        app?.listen(process.env.PORT, () => {
            console.log(`Server is listening on port: http://localhost:${process.env.PORT} ....`);
        });
    } catch (error: any) {
        console.log('MongoDB connection error. Please make sure MongoDB is running: ');
    }
};

// Establish http server connection
startServer();

export default app;
