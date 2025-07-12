import { Request, Response } from 'express';
import { Feedback } from '../models/Feedback.model';

// User tạo feedback
export const createFeedback = async (req: Request, res: Response): Promise<void> => {
    try {
        const { clubId, tableId, content, createdBy } = req.body;
        if (!clubId || !tableId || !content || !createdBy || !createdBy.type) {
            res.status(400).json({ success: false, message: 'Thiếu thông tin.' });
            return;
        }
        const feedback = await Feedback.create({
            clubId, tableId, content, createdBy
        });
        res.status(201).json({ success: true, feedback });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Lấy danh sách feedback (lọc theo club, status, ngày)
export const getFeedbacks = async (req: Request, res: Response): Promise<void> => {
    try {
        const { clubId, status, date } = req.query;
        const filter: any = {};
        if (clubId) filter.clubId = clubId;
        if (status) filter.status = status;
        if (date) {
            const d = new Date(date as string);
            filter.createdAt = { $gte: new Date(d.setHours(0, 0, 0, 0)), $lte: new Date(d.setHours(23, 59, 59, 999)) };
        }
        const feedbacks = await Feedback.find(filter).sort({ createdAt: -1 });
        res.json({ success: true, feedbacks });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Lấy chi tiết feedback
export const getFeedbackDetail = async (req: Request, res: Response): Promise<void> => {
    try {
        const { feedbackId } = req.params;
        const feedback = await Feedback.findOne({ feedbackId });
        if (!feedback) {
            res.status(404).json({ success: false, message: 'Không tìm thấy feedback.' });
            return;
        } res.json({ success: true, feedback });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Cập nhật feedback (note, status, needSupport, history)
export const updateFeedback = async (req: Request & { manager?: any; admin?: any; superAdmin?: any }, res: Response): Promise<void> => {
    try {
        const { feedbackId } = req.params;
        const { note, status, needSupport } = req.body;
        const feedback = await Feedback.findOne({ feedbackId });
        if (!feedback) {
            res.status(404).json({ success: false, message: 'Không tìm thấy feedback.' });
            return;
        }
        // Xác định role và id
        let by = '';
        let role = '';
        if (req.manager) {
            by = req.manager.managerId;
            role = 'manager';
        } else if (req.admin) {
            by = req.admin.adminId;
            role = 'admin';
        } else if (req.superAdmin) {
            by = req.superAdmin.sAdminId;
            role = 'superadmin';
        }

        feedback.history.push({
            by,
            role,
            action: needSupport ? 'need_support' : 'update',
            note,
            date: new Date()
        });

        if (note !== undefined) feedback.note = note;
        if (status) feedback.status = status;
        if (typeof needSupport === 'boolean') feedback.needSupport = needSupport;

        await feedback.save();
        res.json({ success: true, feedback });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};