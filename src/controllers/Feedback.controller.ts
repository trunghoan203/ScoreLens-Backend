import { Request, Response } from 'express';
import { Feedback } from '../models/Feedback.model';
import { Brand } from '../models/Brand.model';

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
export const getFeedbacks = async (req: Request & { manager?: any; admin?: any; superAdmin?: any }, res: Response): Promise<void> => {
    try {
        // Tạo match condition dựa trên role
        let matchCondition: any = {};

        if (req.manager) {
            // Manager chỉ xem feedback của Club mà họ quản lý
            matchCondition.clubId = req.manager.clubId;
        } else if (req.admin) {
            // Admin xem feedback của tất cả Club thuộc Brand họ quản lý
            // Cần lookup để lấy danh sách clubIds từ brandId

            const brand = await Brand.findOne({ brandId: req.admin.brandId });
            if (brand && brand.clubIds && brand.clubIds.length > 0) {
                matchCondition.clubId = { $in: brand.clubIds };
            } else {
                // Nếu không có club nào thuộc brand này, trả về mảng rỗng
                res.json({ success: true, feedbacks: [] });
                return;
            }
        }
        // SuperAdmin có thể xem tất cả feedback (không cần match condition)

        const pipeline: any[] = [];

        // Thêm match condition nếu có
        if (Object.keys(matchCondition).length > 0) {
            pipeline.push({ $match: matchCondition });
        }

        // Thêm các lookup operations
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

        // Tạo match condition dựa trên role
        let matchCondition: any = { feedbackId };

        if (req.manager) {
            // Manager chỉ xem feedback của Club mà họ quản lý
            matchCondition.clubId = req.manager.clubId;
        } else if (req.admin) {
            // Admin xem feedback của tất cả Club thuộc Brand họ quản lý

            const brand = await Brand.findOne({ brandId: req.admin.brandId });
            if (brand && brand.clubIds && brand.clubIds.length > 0) {
                matchCondition.clubId = { $in: brand.clubIds };
            } else {
                // Nếu không có club nào thuộc brand này, trả về không tìm thấy
                res.status(404).json({ success: false, message: 'Không tìm thấy feedback.' });
                return;
            }
        }
        // SuperAdmin có thể xem tất cả feedback (chỉ cần match feedbackId)

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

        // Tạo query condition dựa trên role
        let queryCondition: any = { feedbackId };

        if (req.manager) {
            // Manager chỉ cập nhật feedback của Club mà họ quản lý
            queryCondition.clubId = req.manager.clubId;
        } else if (req.admin) {
            // Admin cập nhật feedback của tất cả Club thuộc Brand họ quản lý

            const brand = await Brand.findOne({ brandId: req.admin.brandId });
            if (brand && brand.clubIds && brand.clubIds.length > 0) {
                queryCondition.clubId = { $in: brand.clubIds };
            } else {
                // Nếu không có club nào thuộc brand này, trả về không tìm thấy
                res.status(404).json({ success: false, message: 'Không tìm thấy feedback.' });
                return;
            }
        }
        // SuperAdmin có thể cập nhật tất cả feedback (chỉ cần match feedbackId)

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

        if (status) feedback.status = status;
        if (typeof needSupport === 'boolean') feedback.needSupport = needSupport;

        await feedback.save();
        res.json({ success: true, feedback });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};