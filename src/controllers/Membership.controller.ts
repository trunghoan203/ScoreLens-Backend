import { Request, Response } from 'express';
import { Membership } from '../models/Membership.model';
import { Club } from '../models/Club.model';

// Lấy danh sách hội viên
export const listMemberships = async (req: Request & { manager?: any }, res: Response): Promise<void> => {
    try {
        const manager = req.manager;
        // Lấy clubId từ manager, sau đó lấy brandId từ club
        const club = await Club.findOne({ clubId: manager.clubId });
        if (!club) {
            res.status(404).json({ success: false, message: 'Club not found' });
            return;
        }
        const brandId = club.brandId;

        const memberships = await Membership.find({ brandId });
        res.json({ success: true, memberships });
        return;
    } catch (error) {
        res.status(500).json({ success: false, message: 'Internal server error' });
        return;
    }
};

// Thêm hội viên
export const createMembership = async (req: Request & { manager?: any }, res: Response): Promise<void> => {
    try {
        const { fullName, phoneNumber } = req.body;
        const manager = req.manager;
        const club = await Club.findOne({ clubId: manager.clubId });
        if (!club) {
            res.status(404).json({ success: false, message: 'Club not found' });
            return;
        }
        const brandId = club.brandId;

        const membership = await Membership.create({ brandId, fullName, phoneNumber });
        res.status(201).json({ success: true, membership });
        return;
    } catch (error) {
        res.status(500).json({ success: false, message: 'Internal server error' });
        return;
    }
};

// Sửa hội viên
export const updateMembership = async (req: Request & { manager?: any }, res: Response): Promise<void> => {
    try {
        const { membershipId } = req.params;
        const { fullName, phoneNumber } = req.body;
        const membership = await Membership.findOneAndUpdate(
            { membershipId },
            { fullName, phoneNumber },
            { new: true }
        );
        if (!membership) {
            res.status(404).json({ success: false, message: 'Membership not found' });
            return;
        }
        res.json({ success: true, membership });
        return;
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: 'Internal server error' });
        return;
    }
};

// Xóa hội viên
export const deleteMembership = async (req: Request & { manager?: any }, res: Response): Promise<void> => {
    try {
        const { membershipId } = req.params;
        const membership = await Membership.findOneAndDelete({ membershipId });
        if (!membership) {
            res.status(404).json({ success: false, message: 'Membership not found' });
            return;
        }
        res.json({ success: true, message: 'Membership deleted' });
        return;
    } catch (error) {
        res.status(500).json({ success: false, message: 'Internal server error' });
        return;
    }
};