import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import notFoundMiddleware from './middlewares/errors/notFound';
import errorHandlerMiddleware from './middlewares/errors/errorHandler';

// handle unhandled rejection error
import './middlewares/errors/unhandledRejection';

// Import Routes
import api from './api';

const app = express();

dotenv.config();

app.use(morgan('dev'));

app.set('trust proxy', 1);

// Set security HTTP headers
app.use(helmet());

// body parser
app.use(express.json({ limit: '50mb' }));

// cookie parser
app.use(cookieParser());

const allowedOrigins = process.env.ORIGIN?.split(',') || [];
allowedOrigins.push('http://localhost:3000');

// cors
app.use(
    cors({
        origin: function (origin, callback) {
            // Allow requests with no origin (like mobile apps or curl)
            if (!origin) return callback(null, true);

            if (allowedOrigins.includes(origin)) {
                return callback(null, true);
            } else {
                return callback(new Error('Not allowed by CORS'));
            }
        },
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
        credentials: true
    })
);

// Limit requests from same API
const limiter = rateLimit({
    max: 2000,
    windowMs: 60 * 1000 * 1000,
    message: 'Too many requests from this IP, please try again in one hour!'
});
app.use('/api', limiter);

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Serve all static files inside public directory.
app.use('/static', express.static('public'));

// Routes which Should handle the requests
app.use('/api', api);

app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);

export default app;
