import { Router } from 'express';
import superAdminRouter from '../routes/SuperAdmin.route';
import adminRouter from '../routes/Admin.route';
import managerRoutes from '../routes/Manager.route';

const router = Router();

router.use('/superAdmin', superAdminRouter);
router.use('/admin', adminRouter);
router.use('/manager', managerRoutes);

export default router;
