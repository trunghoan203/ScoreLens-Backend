import express from 'express';
import { createFeedback } from '../controllers/Feedback.controller';

const membershipRoute = express.Router();

membershipRoute.post('/feedback', createFeedback);

export default membershipRoute;