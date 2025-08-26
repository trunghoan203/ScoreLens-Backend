import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import notFoundMiddleware from './middlewares/errors/notFound';
import errorHandlerMiddleware from './middlewares/errors/errorHandler';

import './middlewares/errors/unhandledRejection';

import api from './api';

const app = express();

dotenv.config();

app.use(morgan('dev'));

app.set('trust proxy', 1);

app.use(helmet());

// body parser
app.use(express.json());

app.use(cookieParser());

const allowedOrigins = process.env.ORIGIN?.split(',') || [];
allowedOrigins.push('http://localhost:3000', 'https://scorelens-omega.vercel.app', 'https://scorelens.io.vn');

// cors
app.use(
    cors({
        origin: function (origin, callback) {
            // Allow requests with no origin (like mobile apps or curl)
            if (!origin) return callback(null, true);

            if (allowedOrigins.includes(origin)) {
                return callback(null, true);
            } else {
                return callback(new Error('Không được CORS cho phép'));
            }
        },
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'x-session-token', 'Range'],
        credentials: true,
        exposedHeaders: ['Content-Range', 'Accept-Ranges', 'Content-Length']
    })
);

const limiter = rateLimit({
    max: 2000,
    windowMs: 60 * 1000 * 1000,
    message: 'Có quá nhiều yêu cầu từ IP này, vui lòng thử lại sau một giờ!'
});
app.use('/api', limiter);

app.use('/static', express.static('public'));

app.use('/api', api);

app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);

export default app;
