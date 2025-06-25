import { SuperAdmin } from '../../models/SuperAdmin.model';

declare global {
  namespace Express {
    interface Request {
      superAdmin?: InstanceType<typeof SuperAdmin>;
    }
  }
}