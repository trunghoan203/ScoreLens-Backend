import { Request, Response } from 'express';
import { NotificationService } from '../services/Notification.service';
import { catchAsync } from '../utils/catchAsync';

export class NotificationController {

  static getUserNotifications = catchAsync(async (req: Request, res: Response) => {
    const { userId: paramUserId, role: paramRole } = req.params as { userId?: string; role?: string };
    const { page = 1, limit = 20 } = req.query;
    
    const authReq = req as any;
    const derivedUserId = paramUserId || authReq?.superAdmin?.sAdminId || authReq?.admin?.adminId || authReq?.manager?.managerId;
    const derivedRole = paramRole || (authReq?.superAdmin ? 'superadmin' : authReq?.admin ? 'admin' : authReq?.manager ? 'manager' : undefined);

    if (!derivedUserId || !derivedRole) {
      return res.status(400).json({ success: false, message: 'Thiếu userId hoặc role' });
    }

    const result = await NotificationService.getUserNotifications(
      derivedUserId,
      derivedRole,
      Number(page),
      Number(limit)
    );

    res.status(200).json({
      success: true,
      data: result
    });
  });

  static markAsRead = catchAsync(async (req: Request, res: Response) => {
    const { notificationId } = req.params;
    const authReq = req as any;
    const derivedUserId =
      authReq?.superAdmin?.sAdminId || authReq?.admin?.adminId || authReq?.manager?.managerId || req.body?.userId;
    const derivedRole = authReq?.superAdmin ? 'superadmin' : authReq?.admin ? 'admin' : authReq?.manager ? 'manager' : undefined;

    if (!derivedUserId) {
      return res.status(400).json({ success: false, message: 'Thiếu userId' });
    }

    const notification = await NotificationService.markAsRead(notificationId, derivedUserId, derivedRole);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông báo hoặc bạn không có quyền truy cập'
      });
    }

    res.status(200).json({
      success: true,
      data: notification
    });
  });

  static markAllAsRead = catchAsync(async (req: Request, res: Response) => {
    const { userId: paramUserId, role: paramRole } = req.params as { userId?: string; role?: string };
    const authReq = req as any;
    const derivedUserId =
      paramUserId || authReq?.superAdmin?.sAdminId || authReq?.admin?.adminId || authReq?.manager?.managerId;
    const derivedRole = paramRole || (authReq?.superAdmin ? 'superadmin' : authReq?.admin ? 'admin' : authReq?.manager ? 'manager' : undefined);

    if (!derivedUserId || !derivedRole) {
      return res.status(400).json({ success: false, message: 'Thiếu userId hoặc role' });
    }

    const result = await NotificationService.markAllAsRead(derivedUserId, derivedRole);

    res.status(200).json({
      success: true,
      data: {
        modifiedCount: result.modifiedCount,
        message: 'Đã đánh dấu tất cả thông báo là đã đọc'
      }
    });
  });

  static getUnreadCount = catchAsync(async (req: Request, res: Response) => {
    const { userId: paramUserId, role: paramRole } = req.params as { userId?: string; role?: string };
    const authReq = req as any;
    const derivedUserId =
      paramUserId || authReq?.superAdmin?.sAdminId || authReq?.admin?.adminId || authReq?.manager?.managerId;
    const derivedRole = paramRole || (authReq?.superAdmin ? 'superadmin' : authReq?.admin ? 'admin' : authReq?.manager ? 'manager' : undefined);

    if (!derivedUserId || !derivedRole) {
      return res.status(400).json({ success: false, message: 'Thiếu userId hoặc role' });
    }

    const count = await NotificationService.getUnreadCount(derivedUserId, derivedRole);

    res.status(200).json({
      success: true,
      data: {
        unreadCount: count
      }
    });
  });

  static deleteNotification = catchAsync(async (req: Request, res: Response) => {
    const { notificationId } = req.params;
    const authReq = req as any;
    const derivedUserId =
      authReq?.superAdmin?.sAdminId || authReq?.admin?.adminId || authReq?.manager?.managerId || req.body?.userId;
    const derivedRole = authReq?.superAdmin ? 'superadmin' : authReq?.admin ? 'admin' : authReq?.manager ? 'manager' : undefined;

    if (!derivedUserId) {
      return res.status(400).json({ success: false, message: 'Thiếu userId' });
    }

    const notification = await NotificationService.deleteNotification(notificationId, derivedUserId, derivedRole);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông báo hoặc bạn không có quyền truy cập'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        message: 'Đã xóa thông báo thành công',
        deletedNotification: notification
      }
    });
  });

}
