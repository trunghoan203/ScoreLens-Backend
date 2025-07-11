import { Request, Response } from 'express';
import { Table } from '../models/Table.model';

// Lấy danh sách bàn (có tìm kiếm, lọc theo loại, trạng thái)
export const listTables = async (req: Request & { manager?: any }, res: Response): Promise<void> => {
    try {
        const { search = '', category, status } = req.query;
        const clubId = req.manager.clubId;
        const query: any = { clubId };
        if (category) query.category = category;
        if (status) query.status = status;
        if (search) query.number = Number(search);
        const tables = await Table.find(query);
        res.json({ success: true, tables });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// Thêm bàn mới
export const createTable = async (req: Request & { manager?: any }, res: Response): Promise<void> => {
    try {
        const { number, category } = req.body;
        const clubId = req.manager.clubId;
        const table = await Table.create({ clubId, number, category });
        res.status(201).json({ success: true, table });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// Sửa thông tin bàn
export const updateTable = async (req: Request & { manager?: any }, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { number, category, status } = req.body;
        const clubId = req.manager.clubId;
        const table = await Table.findOneAndUpdate(
            { _id: id, clubId },
            { number, category, status },
            { new: true }
        );
        if (!table) {
            res.status(404).json({ success: false, message: 'Table not found' });
            return;
        }
        res.json({ success: true, table });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// Xóa bàn
export const deleteTable = async (req: Request & { manager?: any }, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const clubId = req.manager.clubId;
        const table = await Table.findOneAndDelete({ _id: id, clubId });
        if (!table) {
            res.status(404).json({ success: false, message: 'Table not found' });
            return;
        }
        res.json({ success: true, message: 'Table deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
}; 