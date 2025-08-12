import { Request, Response } from 'express';
import { Membership } from '../models/Membership.model';
import { Club } from '../models/Club.model';

// Lấy danh sách hội viên
export const listMemberships = async (req: Request & { manager?: any }, res: Response): Promise<void> => {
    try {
        const manager = req.manager;
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
        const { fullName, phoneNumber, status = 'active' } = req.body;
        const manager = req.manager;
        const club = await Club.findOne({ clubId: manager.clubId });
        if (!club) {
            res.status(404).json({ success: false, message: 'Club not found' });
            return;
        }
        const brandId = club.brandId;

        const membership = await Membership.create({ brandId, fullName, phoneNumber, status });
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
        const { fullName, phoneNumber, status } = req.body;
        const membership = await Membership.findOneAndUpdate(
            { membershipId },
            { fullName, phoneNumber, status },
            { new: true }
        );
        if (!membership) {
            res.status(404).json({ success: false, message: 'Membership not found' });
            return;
        }
        res.json({ success: true, membership });
        return;
    } catch (error) {
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

// @desc    Tìm kiếm membership theo mã
// @route   GET /api/memberships/search/:membershipId
// @access  Public
export const searchMembership = async (req: Request, res: Response): Promise<void> => {
    try {
        const { membershipId } = req.params;

        if (!membershipId) {
            res.status(400).json({
                success: false,
                message: 'Vui lòng cung cấp membershipId.'
            });
            return;
        }

        const membership = await Membership.findOne({ membershipId });
        if (!membership) {
            res.status(404).json({
                success: false,
                message: 'Không tìm thấy hội viên với mã này.'
            });
            return;
        }

        res.status(200).json({
            success: true,
            data: {
                membershipId: membership.membershipId,
                fullName: membership.fullName,
                phoneNumber: membership.phoneNumber,
                brandId: membership.brandId
            }
        });
    } catch (error: any) {
        console.error('Error searching membership:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: error.message
        });
    }
};

// @desc    Lấy thông tin membership
// @route   GET /api/memberships/:id
// @access  Public
export const getMembershipById = async (req: Request, res: Response): Promise<void> => {
    try {
        const membership = await Membership.findById(req.params.id);

        if (!membership) {
            res.status(404).json({
                success: false,
                message: 'Không tìm thấy hội viên.'
            });
            return;
        }

        res.status(200).json({
            success: true,
            data: membership
        });
    } catch (error: any) {
        console.error('Error getting membership:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: error.message
        });
    }
};