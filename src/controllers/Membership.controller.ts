import { Request, Response } from 'express';
import { Membership } from '../models/Membership.model';
import { Club } from '../models/Club.model';
import { MESSAGES } from '../config/messages';

export const listMemberships = async (req: Request & { manager?: any }, res: Response): Promise<void> => {
    try {
        const manager = req.manager;
        const club = await Club.findOne({ clubId: manager.clubId });
        if (!club) {
            res.status(404).json({ success: false, message: MESSAGES.MSG60 });
            return;
        }
        const brandId = club.brandId;

        const memberships = await Membership.find({ brandId });
        res.json({ success: true, memberships });
        return;
    } catch (error) {
        res.status(500).json({ success: false, message: MESSAGES.MSG100 });
        return;
    }
};

export const createMembership = async (req: Request & { manager?: any }, res: Response): Promise<void> => {
    try {
        const { fullName, phoneNumber, status = 'active' } = req.body;
        const manager = req.manager;
        const club = await Club.findOne({ clubId: manager.clubId });
        if (!club) {
            res.status(404).json({ success: false, message: MESSAGES.MSG60 });
            return;
        }
        const brandId = club.brandId;

        const existingMembership = await Membership.findOne({ brandId, phoneNumber });
        if (existingMembership) {
            res.status(400).json({
                success: false,
                message: MESSAGES.MSG67
            });
            return;
        }

        const trimmedFullName = fullName ? fullName.trim() : fullName;

        const membership = await Membership.create({ brandId, fullName: trimmedFullName, phoneNumber, status });
        res.status(201).json({ success: true, membership, message: MESSAGES.MSG64 });
        return;
    } catch (error) {
        res.status(500).json({ success: false, message: MESSAGES.MSG100 });
        return;
    }
};

export const updateMembership = async (req: Request & { manager?: any }, res: Response): Promise<void> => {
    try {
        const { membershipId } = req.params;
        const { fullName, phoneNumber, status } = req.body;

        const existingMembership = await Membership.findOne({ membershipId });
        if (!existingMembership) {
            res.status(404).json({ success: false, message: MESSAGES.MSG61 });
            return;
        }

        if (phoneNumber && phoneNumber !== existingMembership.phoneNumber) {
            const duplicateMembership = await Membership.findOne({
                brandId: existingMembership.brandId,
                phoneNumber,
                membershipId: { $ne: membershipId }
            });
            if (duplicateMembership) {
                res.status(400).json({
                    success: false,
                    message: MESSAGES.MSG67
                });
                return;
            }
        }

        // Trim khoảng trắng từ fullName trước khi lưu
        const trimmedFullName = fullName ? fullName.trim() : fullName;

        const membership = await Membership.findOneAndUpdate(
            { membershipId },
            { fullName: trimmedFullName, phoneNumber, status },
            { new: true }
        );
        res.json({ success: true, membership, message: MESSAGES.MSG66 });
        return;
    } catch (error) {
        res.status(500).json({ success: false, message: MESSAGES.MSG100 });
        return;
    }
};

export const deleteMembership = async (req: Request & { manager?: any }, res: Response): Promise<void> => {
    try {
        const { membershipId } = req.params;
        const membership = await Membership.findOneAndDelete({ membershipId });
        if (!membership) {
            res.status(404).json({ success: false, message: MESSAGES.MSG61 });
            return;
        }
        res.json({ success: true, message: MESSAGES.MSG62 });
        return;
    } catch (error) {
        res.status(500).json({ success: false, message: MESSAGES.MSG100 });
        return;
    }
};

export const searchMembership = async (req: Request, res: Response): Promise<void> => {
    try {
        const { membershipId } = req.params;

        if (!membershipId) {
            res.status(400).json({
                success: false,
                message: MESSAGES.MSG65
            });
            return;
        }

        const membership = await Membership.findOne({ membershipId });
        if (!membership) {
            res.status(404).json({
                success: false,
                message: MESSAGES.MSG61
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
        res.status(500).json({ success: false, message: MESSAGES.MSG100 });
    }
};

export const getMembershipById = async (req: Request, res: Response): Promise<void> => {
    try {
        const membership = await Membership.findById(req.params.id);

        if (!membership) {
            res.status(404).json({
                success: false,
                message: MESSAGES.MSG61
            });
            return;
        }

        res.status(200).json({
            success: true,
            data: membership,
            message: MESSAGES.MSG66
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: MESSAGES.MSG100 });
    }
};

export const getMembershipByPhoneNumber = async (req: Request, res: Response): Promise<void> => {
    try {
        const { phoneNumber } = req.params;

        if (!phoneNumber) {
            res.status(400).json({
                success: false,
                message: 'Số điện thoại không được để trống'
            });
            return;
        }

        const membership = await Membership.findOne({ phoneNumber });

        if (!membership) {
            res.status(404).json({
                success: false,
                message: 'Không tìm thấy hội viên với số điện thoại này'
            });
            return;
        }

        res.status(200).json({
            success: true,
            data: {
                membershipId: membership.membershipId,
                fullName: membership.fullName,
                phoneNumber: membership.phoneNumber,
                status: membership.status
            }
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: MESSAGES.MSG100 });
    }
};