import { Request, Response } from 'express';
import { Feedback } from '../models/Feedback.model';

// User tạo feedback
export const createFeedback = async (req: Request, res: Response): Promise<void> => {
    try {
        const { clubInfo, tableInfo, content, createdBy } = req.body;

        if (!clubInfo?.clubId || !tableInfo?.tableId || !content || !createdBy.type) {
            res.status(400).json({ success: false, message: 'Thiếu thông tin bắt buộc.' });
            return;
        }

        const feedback = await Feedback.create({
            createdBy,
            clubId: clubInfo.clubId,
            tableId: tableInfo.tableId,
            content
        });

        res.status(201).json({ success: true, feedback });
    } catch (error: any) {
        console.log(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Lấy danh sách feedback (lọc theo club, status, ngày)
export const getFeedbacks = async (req: Request, res: Response): Promise<void> => {
    try {
        const feedbacks = await Feedback.aggregate([
            {
                $lookup: {
                    from: 'clubs',
                    localField: 'clubId',
                    foreignField: 'clubId',
                    as: 'clubInfo'
                }
            },
            {
                $lookup: {
                    from: 'tables',
                    localField: 'tableId',
                    foreignField: 'tableId',
                    as: 'tableInfo'
                }
            },
            {
                $unwind: {
                    path: '$clubInfo',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $unwind: {
                    path: '$tableInfo',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $project: {
                    feedbackId: 1,
                    content: 1,
                    status: 1,
                    createdAt: 1,
                    'clubInfo.clubName': 1,
                    'clubInfo.address': 1,
                    'clubInfo.phoneNumber': 1,
                    'tableInfo.name': 1,
                    'tableInfo.category': 1
                }
            }
        ]);

        res.json({ success: true, feedbacks });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Lấy chi tiết feedback
export const getFeedbackDetail = async (req: Request, res: Response): Promise<void> => {
    try {
        const { feedbackId } = req.params;
        const result = await Feedback.aggregate([
            { $match: { feedbackId } },
            {
                $lookup: {
                    from: 'clubs',
                    localField: 'clubId',
                    foreignField: 'clubId',
                    as: 'clubInfo'
                }
            },
            {
                $lookup: {
                    from: 'tables',
                    localField: 'tableId',
                    foreignField: 'tableId',
                    as: 'tableInfo'
                }
            },
            { $unwind: '$clubInfo' },
            { $unwind: '$tableInfo' },
            {
                $project: {
                    feedbackId: 1,
                    content: 1,
                    status: 1,
                    createdAt: 1,
                    'clubInfo.clubName': 1,
                    'clubInfo.address': 1,
                    'clubInfo.phoneNumber': 1,
                    'tableInfo.name': 1,
                    'tableInfo.category': 1
                }
            }
        ]);

        if (result.length === 0) {
            res.status(404).json({ success: false, message: 'Không tìm thấy feedback.' });
            return;
        }

        res.json({ success: true, feedback: result[0] });
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

        let byId = '';
        let byName = '';
        let byRole = '';
        if (req.manager) {
            byId = req.manager.managerId;
            byName = req.manager.fullName;
            byRole = 'manager';
        } else if (req.admin) {
            byId = req.admin.adminId;
            byName = req.admin.fullName;
            byRole = 'admin';
        } else if (req.superAdmin) {
            byId = req.superAdmin.sAdminId;
            byName = req.superAdmin.fullName;
            byRole = 'superadmin';
        }

        const action = status ? `status:${status}` : needSupport ? 'needSupport:true' : 'updated';
        feedback.history.push({
            byId,
            byName,
            byRole,
            action,
            note: note || 'Cập nhật thông tin',
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