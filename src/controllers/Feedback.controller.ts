import { Request, Response } from 'express';
import { Feedback, IFeedback } from '../models/Feedback.model';
import { Brand } from '../models/Brand.model';
import { NotificationService } from '../services/Notification.service';

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

        // Tạo thông báo realtime cho manager (vì status default là managerP)
        try {
            await NotificationService.createFeedbackNotification(feedback.feedbackId, {
                createdBy,
                tableId: tableInfo.tableId,
                clubId: clubInfo.clubId,
                status: feedback.status
            });
        } catch (notificationError) {
            console.error('Error creating notifications:', notificationError);
        }

        res.status(201).json({ success: true, feedback });
    } catch (error: any) {
        console.log(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Lấy danh sách feedback (lọc theo club, status, ngày)
export const getFeedbacks = async (req: Request & { manager?: any; admin?: any; superAdmin?: any }, res: Response): Promise<void> => {
    try {
        let matchCondition: any = {};

        if (req.manager) {
            matchCondition.clubId = req.manager.clubId;
        } else if (req.admin) {

            const brand = await Brand.findOne({ brandId: req.admin.brandId });
            if (brand && brand.clubIds && brand.clubIds.length > 0) {
                matchCondition.clubId = { $in: brand.clubIds };
            } else {
                res.json({ success: true, feedbacks: [] });
                return;
            }
        }

        const pipeline: any[] = [];

        if (Object.keys(matchCondition).length > 0) {
            pipeline.push({ $match: matchCondition });
        }

        pipeline.push(
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
            }
        );

        const feedbacks = await Feedback.aggregate(pipeline);

        res.json({ success: true, feedbacks });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Lấy chi tiết feedback
export const getFeedbackDetail = async (req: Request & { manager?: any; admin?: any; superAdmin?: any }, res: Response): Promise<void> => {
    try {
        const { feedbackId } = req.params;

        let matchCondition: any = { feedbackId };

        if (req.manager) {
            matchCondition.clubId = req.manager.clubId;
        } else if (req.admin) {

            const brand = await Brand.findOne({ brandId: req.admin.brandId });
            if (brand && brand.clubIds && brand.clubIds.length > 0) {
                matchCondition.clubId = { $in: brand.clubIds };
            } else {
                res.status(404).json({ success: false, message: 'Không tìm thấy feedback.' });
                return;
            }
        }

        const result = await Feedback.aggregate([
            { $match: matchCondition },
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
                $addFields: {
                    history: {
                        $sortArray: {
                            input: "$history",
                            sortBy: { date: -1 }
                        }
                    }
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

        let queryCondition: any = { feedbackId };

        if (req.manager) {
            queryCondition.clubId = req.manager.clubId;
        } else if (req.admin) {

            const brand = await Brand.findOne({ brandId: req.admin.brandId });
            if (brand && brand.clubIds && brand.clubIds.length > 0) {
                queryCondition.clubId = { $in: brand.clubIds };
            } else {
                res.status(404).json({ success: false, message: 'Không tìm thấy feedback.' });
                return;
            }
        }

        const feedback = await Feedback.findOne(queryCondition);

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

        feedback.history.push({
            byId,
            byName,
            byRole,
            note: note || '',
            date: new Date()
        });

        const oldStatus = feedback.status;
        if (status) feedback.status = status;
        if (typeof needSupport === 'boolean') feedback.needSupport = needSupport;

        await feedback.save();

        if (status && status !== oldStatus) {
            try {
                await NotificationService.createStatusChangeNotification(feedback.feedbackId, {
                    clubId: feedback.clubId,
                    tableId: feedback.tableId
                }, status);
            } catch (notificationError) {
                console.error('Error creating status change notifications:', notificationError);
            }
        }

        res.json({ success: true, feedback });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};