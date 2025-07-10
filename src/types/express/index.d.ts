import { SuperAdmin } from '../../models/SuperAdmin.model';
import { Admin } from '../../models/Admin.model';
import { Manager } from '../../models/Manager.model'

// type AuthenticatedUser = SuperAdmin | Admin | Manager;

declare global {
  namespace Express {
    interface Request {
      superAdmin?: InstanceType<typeof SuperAdmin>;
      admin?: InstanceType<typeof Admin>;
      manager?: InstanceType<typeof Manager>;
      // user?: AuthenticatedUser;
    }
  }
}