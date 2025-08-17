import { Request, Response } from 'express';
import { Table } from '../models/Table.model';

const escapeRegex = (text: string): string => {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
};

// Lấy danh sách bàn (có tìm kiếm, lọc theo loại, trạng thái)
export const listTables = async (req: Request & { manager?: any }, res: Response): Promise<void> => {
    try {
        const { search = '', category, status } = req.query;
        const clubId = req.manager.clubId;
        const query: any = { clubId };
        if (category) query.category = category;
        if (status) query.status = status;
        if (search) {
            const safeSearchString = escapeRegex(search as string);
            const regex = new RegExp(safeSearchString, 'i');
            query.name = { $regex: regex };
        }
        const tables = await Table.find(query);
        res.json({ success: true, tables });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ' });
    }
};

// Thêm bàn mới
export const createTable = async (req: Request & { manager?: any }, res: Response): Promise<void> => {
    try {
        const { name, category } = req.body;
        const clubId = req.manager.clubId;

        const table = await Table.create({ clubId, name, category });

        res.status(201).json({
            success: true,
            table
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ' });
    }
};

// Sửa thông tin bàn
export const updateTable = async (req: Request & { manager?: any }, res: Response): Promise<void> => {
    try {
        const { tableId } = req.params;
        const { name, category, status } = req.body;
        const clubId = req.manager.clubId;

        const table = await Table.findOneAndUpdate(
            { tableId, clubId },
            { name, category, status },
            { new: true }
        );

        if (!table) {
            res.status(404).json({ success: false, message: 'Bàn không tồn tại' });
            return;
        }

        res.json({
            success: true,
            table
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ' });
    }
};

// Xóa bàn
export const deleteTable = async (req: Request & { manager?: any }, res: Response): Promise<void> => {
    try {
        const { tableId } = req.params;
        const clubId = req.manager.clubId;

        const table = await Table.findOne({ tableId, clubId });
        if (!table) {
            res.status(404).json({ success: false, message: 'Bàn không tồn tại' });
            return;
        }

        await Table.findOneAndDelete({ tableId, clubId });
        res.json({ success: true, message: 'Bàn đã được xóa' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ' });
    }
};

// Xác thực bàn chơi bằng QR code
export const verifyTable = async (req: Request, res: Response): Promise<void> => {
    try {
        const { qrData } = req.body;

        if (!qrData) {
            res.status(400).json({
                success: false,
                message: 'Vui lòng cung cấp QR code data.'
            });
            return;
        }

        const [tableId, clubId] = qrData.split('|');

        if (!tableId || !clubId) {
            res.status(400).json({
                success: false,
                message: 'QR code không hợp lệ.'
            });
            return;
        }

        const table = await Table.findOne({ tableId, clubId });
        if (!table) {
            res.status(404).json({
                success: false,
                message: 'Không tìm thấy bàn chơi với mã này.'
            });
            return;
        }

        res.status(200).json({
            success: true,
            data: {
                tableId: table.tableId,
                name: table.name,
                category: table.category,
                status: table.status,
                clubId: table.clubId
            }
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ' });
    }
};

// Lấy thông tin bàn chơi bằng Id
export const getTableById = async (req: Request, res: Response): Promise<void> => {
    try {
        const table = await Table.findById(req.params.id);

        if (!table) {
            res.status(404).json({
                success: false,
                message: 'Không tìm thấy bàn chơi.'
            });
            return;
        }

        res.status(200).json({
            success: true,
            data: table
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ' });
    }
};

// Lấy danh sách bàn chơi theo club
export const getTablesByClub = async (req: Request, res: Response): Promise<void> => {
    try {
        const { clubId } = req.params;
        const { status, category } = req.query;

        const query: any = { clubId };
        if (status) {
            query.status = status;
        }
        if (category) {
            query.category = category;
        }

        const tables = await Table.find(query).sort({ name: 1 });

        res.status(200).json({
            success: true,
            data: tables
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ' });
    }
};