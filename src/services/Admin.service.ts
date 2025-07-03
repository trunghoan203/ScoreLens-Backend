import { Manager } from '../models/Manager.model';
import { IManager } from '../interfaces/Manager.interface';
import ErrorHandler from '../utils/ErrorHandler';

interface CreateManagerInput {
    fullName: string;
    email: string;
    phoneNumber: string;
    dateOfBirth: string | Date;
    citizenCode: string;
    address: string;
    clubId: string;
}

export const createManagerByAdmin = async (adminId: string, managerData: CreateManagerInput): Promise<Partial<IManager>> => {
    const { email, citizenCode } = managerData;

    // Kiểm tra đồng thời cả email và CCCD đã tồn tại chưa bằng một lần query
    const existingManager = await Manager.findOne({ $or: [{ email }, { citizenCode }] });
    if (existingManager) {
        if (existingManager.email === email) {
            throw new ErrorHandler(`Email '${email}' đã được sử dụng.`, 409); // 409 Conflict
        }
        if (existingManager.citizenCode === citizenCode) {
            throw new ErrorHandler(`Số CCCD '${citizenCode}' đã được sử dụng.`, 409);
        }
    }
    
    // TODO: Kiểm tra quyền của Admin đối với clubId

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
        isActive: newManager.isActive
    };
    
    return managerObject;
};