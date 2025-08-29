import { Manager } from '../models/Manager.model';
import { IManager } from '../interfaces/Manager.interface';
import ErrorHandler from '../utils/ErrorHandler';
import { Club } from '../models/Club.model';

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
    const { email, phoneNumber, citizenCode, clubId } = managerData;

    const club = await Club.findOne({ clubId });
    if (!club) {
        throw new ErrorHandler('Club không tồn tại.', 404);
    }
    const brandId = club.brandId;

    const existingManager = await Manager.findOne({
        brandId,
        $or: [{ email }, { phoneNumber }, { citizenCode }]
    });

    if (existingManager) {
        if (existingManager.email === email) {
            throw new ErrorHandler(`Email '${email}' đã được sử dụng trong thương hiệu này.`, 409);
        }
        if (existingManager.phoneNumber === phoneNumber) {
            throw new ErrorHandler(`Số điện thoại '${phoneNumber}' đã được sử dụng trong thương hiệu này.`, 409);
        }
        if (existingManager.citizenCode === citizenCode) {
            throw new ErrorHandler(`Số CCCD '${citizenCode}' đã được sử dụng trong thương hiệu này.`, 409);
        }
    }

    const newManager = await Manager.create({ ...managerData, brandId });

    const managerObject = {
        _id: newManager._id,
        fullName: newManager.fullName,
        email: newManager.email,
        phoneNumber: newManager.phoneNumber,
        dateOfBirth: newManager.dateOfBirth,
        citizenCode: newManager.citizenCode,
        address: newManager.address,
        clubId: newManager.clubId,
        brandId: newManager.brandId,
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

    let newBrandId = manager.brandId;
    if (updateData.clubId && updateData.clubId !== manager.clubId) {
        const club = await Club.findOne({ clubId: updateData.clubId });
        if (!club) {
            throw new ErrorHandler('Club không tồn tại.', 404);
        }
        newBrandId = club.brandId;
    }

    if (updateData.email || updateData.phoneNumber || updateData.citizenCode) {
        const queryConditions: any = {
            brandId: newBrandId,
            managerId: { $ne: managerId }
        };

        if (updateData.email) {
            queryConditions.email = updateData.email;
        }
        if (updateData.phoneNumber) {
            queryConditions.phoneNumber = updateData.phoneNumber;
        }
        if (updateData.citizenCode) {
            queryConditions.citizenCode = updateData.citizenCode;
        }

        const existingManager = await Manager.findOne(queryConditions);
        if (existingManager) {
            if (updateData.email && existingManager.email === updateData.email) {
                throw new ErrorHandler(`Email '${updateData.email}' đã được sử dụng trong thương hiệu này.`, 409);
            }
            if (updateData.phoneNumber && existingManager.phoneNumber === updateData.phoneNumber) {
                throw new ErrorHandler(`Số điện thoại '${updateData.phoneNumber}' đã được sử dụng trong thương hiệu này.`, 409);
            }
            if (updateData.citizenCode && existingManager.citizenCode === updateData.citizenCode) {
                throw new ErrorHandler(`Số CCCD '${updateData.citizenCode}' đã được sử dụng trong thương hiệu này.`, 409);
            }
        }
    }

    const updatedManager = await Manager.findOneAndUpdate(
        { managerId },
        { ...updateData, brandId: newBrandId },
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
        brandId: updatedManager.brandId,
        isActive: updatedManager.isActive,
        managerId: updatedManager.managerId
    };

    return managerObject;
};

export const deleteManagerByAdmin = async (adminId: string, managerId: string): Promise<void> => {
    const manager = await Manager.findOne({ managerId });
    if (!manager) {
        throw new ErrorHandler('Manager không tồn tại.', 404);
    }
    if (manager.isActive) {
        throw new ErrorHandler(
            'Không thể xóa Manager đang hoạt động. Vui lòng vô hiệu hóa tài khoản trước khi xóa.',
            409
        );
    }

    await Manager.deleteOne({ managerId });
};

export const deactivateManagerByAdmin = async (adminId: string, managerId: string): Promise<Partial<IManager>> => {
    const manager = await Manager.findOne({ managerId });
    if (!manager) {
        throw new ErrorHandler('Manager không tồn tại.', 404);
    }

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

export const getAllManagersByAdmin = async (brandId?: string): Promise<Partial<IManager>[]> => {
    const filter: any = {};
    if (brandId) {
        filter.brandId = brandId;
    }
    const managers = await Manager.find(filter);
    return managers.map(m => ({
        _id: m._id,
        fullName: m.fullName,
        email: m.email,
        phoneNumber: m.phoneNumber,
        dateOfBirth: m.dateOfBirth,
        citizenCode: m.citizenCode,
        address: m.address,
        clubId: m.clubId,
        brandId: m.brandId,
        isActive: m.isActive,
        managerId: m.managerId
    }));
};

export const getManagerDetailByAdmin = async (managerId: string): Promise<Partial<IManager>> => {
    const manager = await Manager.findOne({ managerId });
    if (!manager) {
        throw new ErrorHandler('Manager không tồn tại.', 404);
    }
    return {
        _id: manager._id,
        fullName: manager.fullName,
        email: manager.email,
        phoneNumber: manager.phoneNumber,
        dateOfBirth: manager.dateOfBirth,
        citizenCode: manager.citizenCode,
        address: manager.address,
        clubId: manager.clubId,
        brandId: manager.brandId,
        isActive: manager.isActive,
        managerId: manager.managerId
    };
};