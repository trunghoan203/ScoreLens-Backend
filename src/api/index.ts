import express from 'express';
import superAdminRoutes from '../routes/SuperAdmin.route'


const router = express.Router();

router.use('/superAdmin', superAdminRoutes );


export default router;
