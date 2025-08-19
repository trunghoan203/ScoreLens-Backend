import { Router } from 'express';
import superAdminRouter from '../routes/SuperAdmin.route';
import adminRouter from '../routes/Admin.route';
import managerRoutes from '../routes/Manager.route';
import membershipRoute from '../routes/Membership.route';
import notificationRouter from '../routes/Notification.route';

const router = Router();

router.use('/superAdmin', superAdminRouter);
router.use('/admin', adminRouter);
router.use('/manager', managerRoutes);
router.use('/membership', membershipRoute);
router.use('/notifications', notificationRouter);

export default router;
