import { Request, Response } from 'express';
import { Table } from '../models/Table.model';
import { MESSAGES } from '../config/messages';

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
        res.status(500).json({ success: false, message: MESSAGES.MSG100 });
    }
};

// Thêm bàn mới
export const createTable = async (req: Request & { manager?: any }, res: Response): Promise<void> => {
    try {
        const { name, category } = req.body;
        const clubId = req.manager.clubId;

        const existingTable = await Table.findOne({
            clubId,
            name: { $regex: new RegExp(`^${name}$`, 'i') },
            category
        });

        if (existingTable) {
            const categoryLabel = category === 'pool-8' ? 'Pool-8' : 'Carom';
            res.status(400).json({
                success: false,
                message: `Tên bàn "${name}" đã tồn tại trong loại bàn ${categoryLabel}`
            });
            return;
        }

        const table = await Table.create({ clubId, name, category });

        res.status(201).json({
            success: true,
            table,
            message: MESSAGES.MSG37
        });
    } catch (error) {
        res.status(500).json({ success: false, message: MESSAGES.MSG100 });
    }
};

// Sửa thông tin bàn
export const updateTable = async (req: Request & { manager?: any }, res: Response): Promise<void> => {
    try {
        const { tableId } = req.params;
        const { name, category, status } = req.body;
        const clubId = req.manager.clubId;

        if (name || category) {
            const currentTable = await Table.findOne({ tableId, clubId });
            if (!currentTable) {
                res.status(404).json({ success: false, message: MESSAGES.MSG40 });
                return;
            }

            const finalName = name || currentTable.name;
            const finalCategory = category || currentTable.category;

            const existingTable = await Table.findOne({
                clubId,
                name: { $regex: new RegExp(`^${finalName}$`, 'i') },
                category: finalCategory,
                tableId: { $ne: tableId }
            });

            if (existingTable) {
                res.status(400).json({
                    success: false,
                    message: `Tên bàn "${finalName}" đã tồn tại trong loại bàn ${finalCategory === 'pool-8' ? 'Pool-8' : 'Carom'}`
                });
                return;
            }
        }

        const table = await Table.findOneAndUpdate(
            { tableId, clubId },
            { name, category, status },
            { new: true }
        );

        if (!table) {
            res.status(404).json({ success: false, message: MESSAGES.MSG40 });
            return;
        }

        res.json({
            success: true,
            table,
            message: MESSAGES.MSG38
        });
    } catch (error) {
        res.status(500).json({ success: false, message: MESSAGES.MSG100 });
    }
};

// Xóa bàn
export const deleteTable = async (req: Request & { manager?: any }, res: Response): Promise<void> => {
    try {
        const { tableId } = req.params;
        const clubId = req.manager.clubId;

        const table = await Table.findOne({ tableId, clubId });
        if (!table) {
            res.status(404).json({ success: false, message: MESSAGES.MSG40 });
            return;
        }

        await Table.findOneAndDelete({ tableId, clubId });
        res.json({ success: true, message: MESSAGES.MSG41 });
    } catch (error) {
        res.status(500).json({ success: false, message: MESSAGES.MSG100 });
    }
};

// Xác thực bàn chơi bằng QR code
export const verifyTable = async (req: Request, res: Response): Promise<void> => {
    try {
        const { qrData } = req.body;

        if (!qrData) {
            res.status(400).json({
                success: false,
                message: MESSAGES.MSG42
            });
            return;
        }

        const [tableId, clubId] = qrData.split('|');

        if (!tableId || !clubId) {
            res.status(400).json({
                success: false,
                message: MESSAGES.MSG42
            });
            return;
        }

        const table = await Table.findOne({ tableId, clubId });
        if (!table) {
            res.status(404).json({
                success: false,
                message: MESSAGES.MSG43
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
        res.status(500).json({ success: false, message: MESSAGES.MSG100 });
    }
};

// Lấy thông tin bàn chơi bằng Id
export const getTableById = async (req: Request, res: Response): Promise<void> => {
    try {
        const table = await Table.findById(req.params.id);

        if (!table) {
            res.status(404).json({
                success: false,
                message: MESSAGES.MSG43
            });
            return;
        }

        res.status(200).json({
            success: true,
            data: table
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: MESSAGES.MSG100 });
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
            data: tables,
            message: MESSAGES.MSG47
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: MESSAGES.MSG100 });
    }
};