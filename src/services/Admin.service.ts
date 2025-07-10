import { Manager } from '../models/Manager.model';
import { IManager } from '../interfaces/Manager.interface';
import ErrorHandler from '../utils/ErrorHandler';
import { Match } from '../models/Match.model';
import { MatchEvent } from '../models/MatchEvent.model';

interface CreateManagerInput {
    fullName: string;
    email: string;
    phoneNumber: string;
    dateOfBirth: string | Date;
    citizenCode: string;
    address: string;
    clubId: string;
}

interface UpdateManagerInput {
    fullName?: string;
    email?: string;
    phoneNumber?: string;
    dateOfBirth?: string | Date;
    citizenCode?: string;
    address?: string;
    clubId?: string;
    isActive?: boolean;
}

export const createManagerByAdmin = async (adminId: string, managerData: CreateManagerInput): Promise<Partial<IManager>> => {
    const { email, citizenCode } = managerData;

    const existingManager = await Manager.findOne({ $or: [{ email }, { citizenCode }] });
    if (existingManager) {
        if (existingManager.email === email) {
            throw new ErrorHandler(`Email '${email}' đã được sử dụng.`, 409);
        }
        if (existingManager.citizenCode === citizenCode) {
            throw new ErrorHandler(`Số CCCD '${citizenCode}' đã được sử dụng.`, 409);
        }
    }

    const newManager = await Manager.create(managerData);

    const managerObject = {
        _id: newManager._id,
        fullName: newManager.fullName,
        email: newManager.email,
        phoneNumber: newManager.phoneNumber,
        dateOfBirth: newManager.dateOfBirth,
        citizenCode: newManager.citizenCode,
        address: newManager.address,
        clubId: newManager.clubId,
        isActive: newManager.isActive,
        managerId: newManager.managerId
    };

    return managerObject;
};

export const updateManagerByAdmin = async (adminId: string, managerId: string, updateData: UpdateManagerInput): Promise<Partial<IManager>> => {
    const manager = await Manager.findOne({ managerId });
    if (!manager) {
        throw new ErrorHandler('Manager không tồn tại.', 404);
    }

    if (updateData.email || updateData.citizenCode) {
        const queryConditions: any = {};

        if (updateData.email) {
            queryConditions.email = updateData.email;
        }
        if (updateData.citizenCode) {
            queryConditions.citizenCode = updateData.citizenCode;
        }
        queryConditions.managerId = { $ne: managerId };

        const existingManager = await Manager.findOne(queryConditions);
        if (existingManager) {
            if (updateData.email && existingManager.email === updateData.email) {
                throw new ErrorHandler(`Email '${updateData.email}' đã được sử dụng.`, 409);
            }
            if (updateData.citizenCode && existingManager.citizenCode === updateData.citizenCode) {
                throw new ErrorHandler(`Số CCCD '${updateData.citizenCode}' đã được sử dụng.`, 409);
            }
        }
    }

    const updatedManager = await Manager.findOneAndUpdate(
        { managerId },
        updateData,
        { new: true, runValidators: true }
    );

    if (!updatedManager) {
        throw new ErrorHandler('Không thể cập nhật Manager.', 500);
    }

    const managerObject = {
        _id: updatedManager._id,
        fullName: updatedManager.fullName,
        email: updatedManager.email,
        phoneNumber: updatedManager.phoneNumber,
        dateOfBirth: updatedManager.dateOfBirth,
        citizenCode: updatedManager.citizenCode,
        address: updatedManager.address,
        clubId: updatedManager.clubId,
        isActive: updatedManager.isActive,
        managerId: updatedManager.managerId
    };

    return managerObject;
};

export const deleteManagerByAdmin = async (adminId: string, managerId: string): Promise<void> => {
    // Tìm manager bằng managerId
    const manager = await Manager.findOne({ managerId });
    if (!manager) {
        throw new ErrorHandler('Manager không tồn tại.', 404);
    }

    const activeMatches = await Match.find({
        managerId: managerId,
        endTime: { $exists: false }
    });

    if (activeMatches.length > 0) {
        throw new ErrorHandler(
            `Không thể xóa Manager vì đang có ${activeMatches.length} trận đấu đang diễn ra. Vui lòng kết thúc các trận đấu trước khi xóa.`,
            409
        );
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentMatches = await Match.find({
        managerId: managerId,
        endTime: { $gte: thirtyDaysAgo }
    });

    if (recentMatches.length > 0) {
        throw new ErrorHandler(
            `Không thể xóa Manager vì có ${recentMatches.length} trận đấu đã diễn ra trong 30 ngày gần đây. Vui lòng chờ sau 30 ngày để xóa.`,
            409
        );
    }

    const matchEvents = await MatchEvent.find({ managerId: managerId });

    if (matchEvents.length > 0) {
        throw new ErrorHandler(
            `Không thể xóa Manager vì có ${matchEvents.length} sự kiện trận đấu được tạo bởi manager này. Vui lòng xóa các sự kiện trước.`,
            409
        );
    }

    if (manager.isActive) {
        throw new ErrorHandler(
            'Không thể xóa Manager đang hoạt động. Vui lòng vô hiệu hóa tài khoản trước khi xóa.',
            409
        );
    }

    // Xóa manager bằng managerId
    await Manager.deleteOne({ managerId });
};

export const deactivateManagerByAdmin = async (adminId: string, managerId: string): Promise<Partial<IManager>> => {
    // Tìm manager bằng managerId
    const manager = await Manager.findOne({ managerId });
    if (!manager) {
        throw new ErrorHandler('Manager không tồn tại.', 404);
    }

    const activeMatches = await Match.find({
        managerId: managerId,
        endTime: { $exists: false }
    });

    if (activeMatches.length > 0) {
        throw new ErrorHandler(
            `Không thể vô hiệu hóa Manager vì đang có ${activeMatches.length} trận đấu đang diễn ra. Vui lòng kết thúc các trận đấu trước khi vô hiệu hóa.`,
            409
        );
    }

    // Vô hiệu hóa manager bằng managerId
    manager.isActive = false;
    await manager.save();

    const managerObject = {
        _id: manager._id,
        fullName: manager.fullName,
        email: manager.email,
        phoneNumber: manager.phoneNumber,
        dateOfBirth: manager.dateOfBirth,
        citizenCode: manager.citizenCode,
        address: manager.address,
        clubId: manager.clubId,
        isActive: manager.isActive,
        managerId: manager.managerId
    };

    return managerObject;
};

export const getAllManagersByAdmin = async (): Promise<Partial<IManager>[]> => {
    const managers = await Manager.find();
    return managers.map(m => ({
        _id: m._id,
        fullName: m.fullName,
        email: m.email,
        phoneNumber: m.phoneNumber,
        dateOfBirth: m.dateOfBirth,
        citizenCode: m.citizenCode,
        address: m.address,
        clubId: m.clubId,
        isActive: m.isActive,
        managerId: m.managerId
    }));
};