import { Notification, INotification } from '../models/Notification.model';
import { Admin } from '../models/Admin.model';
import { Manager } from '../models/Manager.model';
import { SuperAdmin } from '../models/SuperAdmin.model';
import { Brand } from '../models/Brand.model';
import { Club } from '../models/Club.model';
import { Table } from '../models/Table.model';
import { getIO } from '../socket';
import { MESSAGES } from '../config/messages';

export class NotificationService {
  // Tạo thông báo cho feedback mới (chỉ tạo theo status hiện tại)
  static async createFeedbackNotification(feedbackId: string, feedbackData: any) {
    try {
      const notifications: INotification[] = [];
      const { clubId, tableId, status = 'managerP' } = feedbackData;

      // Lấy thông tin table, club, brand
      const table = await Table.findOne({ tableId }).select('name');
      const club = await Club.findOne({ clubId }).select('clubName brandId');
      const brand = club ? await Brand.findOne({ brandId: club.brandId }).select('brandName') : null;

      const tableName = table?.name || 'Bàn không xác định';
      const clubName = club?.clubName || 'Club không xác định';
      const brandName = brand?.brandName || 'Brand không xác định';

      // Chỉ tạo thông báo theo status hiện tại của feedback
      switch (status) {
        case 'managerP':
          // Tạo thông báo cho Manager quản lý club này
          const managers = await Manager.find({ 
            clubId: clubId,
            isActive: true 
          });
          
          for (const manager of managers) {
            notifications.push({
              notificationId: `NOTI-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
              feedbackId,
              title: 'Feedback mới',
              message: `Có feedback mới từ ${tableName} tại ${clubName} (${brandName}) cần xử lý`,
              recipientId: manager.managerId,
              recipientRole: 'manager',
              isRead: false,
              dateTime: new Date()
            } as INotification);
          }
          break;

        case 'adminP':
          // Tạo thông báo cho Admin quản lý brand chứa club này
          if (club && club.brandId) {
            const admins = await Admin.find({ 
              brandId: club.brandId,
              status: 'approved', 
              isVerified: true 
            });
            
            for (const admin of admins) {
              notifications.push({
                notificationId: `NOTI-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
                feedbackId,
                title: 'Feedback mới',
                message: `Có feedback mới từ ${tableName} tại ${clubName} (${brandName}) cần xử lý`,
                recipientId: admin.adminId,
                recipientRole: 'admin',
                isRead: false,
                dateTime: new Date()
              } as INotification);
            }
          }
          break;

        case 'superadminP':
          // Tạo thông báo cho tất cả SuperAdmin
          const superAdmins = await SuperAdmin.find({ isVerified: true });
          for (const sAdmin of superAdmins) {
            notifications.push({
              notificationId: `NOTI-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
              feedbackId,
              title: 'Feedback mới',
              message: `Có feedback mới từ ${tableName} tại ${clubName} (${brandName}) cần xử lý`,
              recipientId: sAdmin.sAdminId,
              recipientRole: 'superadmin',
              isRead: false,
              dateTime: new Date()
            } as INotification);
          }
          break;

        case 'resolved':
          break;
      }

      // Lưu thông báo vào database nếu có
      if (notifications.length > 0) {
        const savedNotifications = await Notification.insertMany(notifications);
        // Gửi thông báo realtime qua socket
        this.sendRealtimeNotifications(savedNotifications);
      } 

      return notifications;
    } catch (error) {
      console.error(MESSAGES.MSG100, error);
      throw error;
    }
  }

  /**
   * Tạo thông báo khi status feedback thay đổi
   */
  static async createStatusChangeNotification(feedbackId: string, feedbackData: any, newStatus: string) {
    try {
      const notifications: INotification[] = [];
      const { clubId, tableId } = feedbackData;

      // Lấy thông tin table, club, brand
      const table = await Table.findOne({ tableId }).select('name');
      const club = await Club.findOne({ clubId }).select('clubName brandId');
      const brand = club ? await Brand.findOne({ brandId: club.brandId }).select('brandName') : null;

      const tableName = table?.name || 'Bàn không xác định';
      const clubName = club?.clubName || 'Club không xác định';
      const brandName = brand?.brandName || 'Brand không xác định';

      // Chỉ tạo thông báo theo status mới
      switch (newStatus) {
        case 'adminP':
          // Tạo thông báo cho Admin quản lý brand chứa club này
          if (club && club.brandId) {
            const admins = await Admin.find({ 
              brandId: club.brandId,
              status: 'approved', 
              isVerified: true 
            });
            
            for (const admin of admins) {
              notifications.push({
                notificationId: `NOTI-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
                feedbackId,
                title: 'Feedback mới',
                message: `Có feedback mới từ ${tableName} tại ${clubName} (${brandName}) cần xử lý`,
                recipientId: admin.adminId,
                recipientRole: 'admin',
                isRead: false,
                dateTime: new Date()
              } as INotification);
            }
          }
          break;

        case 'superadminP':
          // Tạo thông báo cho tất cả SuperAdmin
          const superAdmins = await SuperAdmin.find({ isVerified: true });
          for (const sAdmin of superAdmins) {
            notifications.push({
              notificationId: `NOTI-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
              feedbackId,
              title: 'Feedback mới',
              message: `Có feedback mới từ ${tableName} tại ${clubName} (${brandName}) cần xử lý`,
              recipientId: sAdmin.sAdminId,
              recipientRole: 'superadmin',
              isRead: false,
              dateTime: new Date()
            } as INotification);
          }
          break;

        case 'resolved':
          // Không tạo thông báo khi feedback đã resolved
          break;
      }

      // Lưu thông báo vào database nếu có
      if (notifications.length > 0) {
        const savedNotifications = await Notification.insertMany(notifications);       
        // Gửi thông báo realtime qua socket
        this.sendRealtimeNotifications(savedNotifications);
      }

      return notifications;
    } catch (error) {
      console.error(MESSAGES.MSG100, error);
      throw error;
    }
  }

  /**
   * Gửi thông báo realtime qua socket
   */
  static sendRealtimeNotifications(notifications: INotification[]) {
    try {
      const io = getIO();

      // Nhóm thông báo theo role để gửi hiệu quả
      const notificationsByRole = notifications.reduce((acc, notification) => {
        if (!acc[notification.recipientRole]) {
          acc[notification.recipientRole] = [];
        }
        acc[notification.recipientRole].push(notification);
        return acc;
      }, {} as Record<string, INotification[]>);

      // Gửi thông báo cho từng role
      Object.entries(notificationsByRole).forEach(([role, roleNotifications]) => {
        io.to(`role_${role}`).emit('new_notification', {
          type: 'feedback',
          notifications: roleNotifications,
          message: `Có ${roleNotifications.length} thông báo mới`
        });
      });

      // Gửi thông báo chung cho tất cả
      io.emit('feedback_created', {
        type: 'feedback',
        message: 'Có feedback mới',
        count: notifications.length
      });

    } catch (error) {
      console.error(MESSAGES.MSG100, error);
    }
  }

  /**
   * Lấy thông báo cho user cụ thể với phân quyền theo role
   */
  static async getUserNotifications(userId: string, role: string, page: number = 1, limit: number = 20) {
    try {
      const skip = (page - 1) * limit;
      
      let matchCondition: any = {
        recipientId: userId,
        recipientRole: role
      };

      // Nếu là admin, chỉ lấy thông báo của brand họ quản lý
      if (role === 'admin') {
        const admin = await Admin.findOne({ adminId: userId });
        if (admin && admin.brandId) {
          // Lấy tất cả club thuộc brand
          const brand = await Brand.findOne({ brandId: admin.brandId });
          if (brand && brand.clubIds && brand.clubIds.length > 0) {
            // Lấy feedback của các club thuộc brand
            const feedbackIds = await this.getFeedbackIdsByClubIds(brand.clubIds);
            if (feedbackIds.length > 0) {
              matchCondition.feedbackId = { $in: feedbackIds };
            } else {
              // Nếu không có feedback nào, trả về rỗng
              return {
                notifications: [],
                pagination: {
                  page,
                  limit,
                  total: 0,
                  pages: 0
                }
              };
            }
          } else {
            // Nếu brand không có club nào, trả về rỗng
            return {
              notifications: [],
              pagination: {
                page,
                limit,
                total: 0,
                pages: 0
              }
            };
          }
        } else {
          // Nếu admin chưa có brandId, trả về rỗng
          return {
            notifications: [],
            pagination: {
              page,
              limit,
              total: 0,
              pages: 0
            }
          };
        }
      }

      // Nếu là manager, chỉ lấy thông báo của club họ quản lý
      if (role === 'manager') {
        const manager = await Manager.findOne({ managerId: userId });
        if (manager && manager.clubId) {
          // Lấy feedback của club manager quản lý
          const feedbackIds = await this.getFeedbackIdsByClubIds([manager.clubId]);
          if (feedbackIds.length > 0) {
            matchCondition.feedbackId = { $in: feedbackIds };
          } else {
            // Nếu không có feedback nào, trả về rỗng
            return {
              notifications: [],
              pagination: {
                page,
                limit,
                total: 0,
                pages: 0
              }
            };
          }
        } else {
          // Nếu manager chưa có clubId, trả về rỗng
          return {
            notifications: [],
            pagination: {
              page,
              limit,
              total: 0,
              pages: 0
            }
          };
        }
      }

      // SuperAdmin có thể xem tất cả thông báo (không cần filter)

      const notifications = await Notification.find(matchCondition)
        .sort({ dateTime: -1 })
        .skip(skip)
        .limit(limit)
        .select('notificationId feedbackId title message recipientId recipientRole isRead dateTime createdAt updatedAt');

      const total = await Notification.countDocuments(matchCondition);

      return {
        notifications,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error(MESSAGES.MSG100, error);
      throw error;
    }
  }

  /**
   * Lấy danh sách feedback IDs theo club IDs
   */
  private static async getFeedbackIdsByClubIds(clubIds: string[]): Promise<string[]> {
    try {
      const { Feedback } = await import('../models/Feedback.model');
      const feedbacks = await Feedback.find({ clubId: { $in: clubIds } }).select('feedbackId');
      return feedbacks.map((feedback: any) => feedback.feedbackId);
    } catch (error) {
      console.error(MESSAGES.MSG100, error);
      return [];
    }
  }

  /**
   * Đánh dấu thông báo đã đọc
   */
  static async markAsRead(notificationId: string, userId: string, role?: string) {
    try {
      let matchCondition: any = {
        notificationId: notificationId,
        recipientId: userId
      };

      // Nếu có role, thêm vào điều kiện tìm kiếm
      if (role) {
        matchCondition.recipientRole = role;
      }

      const notification = await Notification.findOneAndUpdate(
        matchCondition,
        {
          isRead: true
        },
        { new: true }
      );

      return notification;
    } catch (error) {
      console.error(MESSAGES.MSG100, error);
      throw error;
    }
  }

  /**
   * Đánh dấu tất cả thông báo đã đọc
   */
  static async markAllAsRead(userId: string, role: string) {
    try {
      let matchCondition: any = {
        recipientId: userId,
        recipientRole: role,
        isRead: false
      };

      // Áp dụng phân quyền tương tự như getUserNotifications
      if (role === 'admin') {
        const admin = await Admin.findOne({ adminId: userId });
        if (admin && admin.brandId) {
          const brand = await Brand.findOne({ brandId: admin.brandId });
          if (brand && brand.clubIds && brand.clubIds.length > 0) {
            const feedbackIds = await this.getFeedbackIdsByClubIds(brand.clubIds);
            if (feedbackIds.length > 0) {
              matchCondition.feedbackId = { $in: feedbackIds };
            } else {
              return { modifiedCount: 0 };
            }
          } else {
            return { modifiedCount: 0 };
          }
        } else {
          return { modifiedCount: 0 };
        }
      }

      if (role === 'manager') {
        const manager = await Manager.findOne({ managerId: userId });
        if (manager && manager.clubId) {
          const feedbackIds = await this.getFeedbackIdsByClubIds([manager.clubId]);
          if (feedbackIds.length > 0) {
            matchCondition.feedbackId = { $in: feedbackIds };
          } else {
            return { modifiedCount: 0 };
          }
        } else {
          return { modifiedCount: 0 };
        }
      }

      const result = await Notification.updateMany(matchCondition, {
        isRead: true
      });

      return result;
    } catch (error) {
      console.error(MESSAGES.MSG100, error);
      throw error;
    }
  }

  /**
   * Đếm số thông báo chưa đọc
   */
  static async getUnreadCount(userId: string, role: string) {
    try {
      let matchCondition: any = {
        recipientId: userId,
        recipientRole: role,
        isRead: false
      };

      // Áp dụng phân quyền tương tự như getUserNotifications
      if (role === 'admin') {
        const admin = await Admin.findOne({ adminId: userId });
        if (admin && admin.brandId) {
          const brand = await Brand.findOne({ brandId: admin.brandId });
          if (brand && brand.clubIds && brand.clubIds.length > 0) {
            const feedbackIds = await this.getFeedbackIdsByClubIds(brand.clubIds);
            if (feedbackIds.length > 0) {
              matchCondition.feedbackId = { $in: feedbackIds };
            } else {
              return 0;
            }
          } else {
            return 0;
          }
        } else {
          return 0;
        }
      }

      if (role === 'manager') {
        const manager = await Manager.findOne({ managerId: userId });
        if (manager && manager.clubId) {
          const feedbackIds = await this.getFeedbackIdsByClubIds([manager.clubId]);
          if (feedbackIds.length > 0) {
            matchCondition.feedbackId = { $in: feedbackIds };
          } else {
            return 0;
          }
        } else {
          return 0;
        }
      }

      const count = await Notification.countDocuments(matchCondition);
      return count;
    } catch (error) {
      console.error(MESSAGES.MSG100, error);
      throw error;
    }
  }

  /**
   * Xóa thông báo
   */
  static async deleteNotification(notificationId: string, userId: string, role?: string) {
    try {
      let matchCondition: any = {
        notificationId: notificationId,
        recipientId: userId
      };

      // Nếu có role, thêm vào điều kiện tìm kiếm
      if (role) {
        matchCondition.recipientRole = role;
      }

      const notification = await Notification.findOneAndDelete(matchCondition);

      return notification;
    } catch (error) {
      console.error(MESSAGES.MSG100, error);
      throw error;
    }
  }

}
