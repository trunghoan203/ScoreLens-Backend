import { Router } from 'express';
import superAdminRouter from '../routes/SuperAdmin.route';
import adminRouter from '../routes/Admin.route';

const router = Router();

router.use('/superAdmin', superAdminRouter);
router.use('/admin', adminRouter);

export default router;
