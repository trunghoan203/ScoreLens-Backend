import { Request, Response } from 'express';
import { Camera } from '../models/Camera.model';
import { Table } from '../models/Table.model';

// Lấy danh sách camera (theo club của manager)
export const listCameras = async (req: Request & { manager?: any }, res: Response): Promise<void> => {
    try {
        const manager = req.manager;
        const clubId = manager.clubId;
        // Lấy tất cả camera thuộc các bàn của club này
        const tables = await Table.find({ clubId });
        const tableIds = tables.map(t => t.tableId);
        const cameras = await Camera.find({ tableId: { $in: tableIds } });
        res.json({ success: true, cameras });
        return;
    } catch (error) {
        res.status(500).json({ success: false, message: 'Internal server error' });
        return;
    }
};

// Thêm camera
export const createCamera = async (req: Request & { manager?: any }, res: Response): Promise<void> => {
    try {
        const { tableId, IPAddress, username, password } = req.body;
        // Kiểm tra tableId có thuộc club của manager không
        const manager = req.manager;
        const table = await Table.findOne({ tableId, clubId: manager.clubId });
        if (!table) {
            res.status(404).json({ success: false, message: 'Table not found or not in your club' });
            return;
        }
        const camera = await Camera.create({ tableId, IPAddress, username, password });
        res.status(201).json({ success: true, camera });
        return;
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: 'Internal server error' });
        return;
    }
};

// Sửa camera
export const updateCamera = async (req: Request & { manager?: any }, res: Response): Promise<void> => {
    try {
        const { cameraId } = req.params;
        const { tableId, IPAddress, username, password, isConnect } = req.body;
        const manager = req.manager;
        // Kiểm tra camera thuộc club của manager
        const camera = await Camera.findOne({ cameraId });
        if (!camera) {
            res.status(404).json({ success: false, message: 'Camera not found' });
            return;
        }
        // Nếu đổi tableId, kiểm tra table mới có thuộc club không
        if (tableId) {
            const table = await Table.findOne({ tableId, clubId: manager.clubId });
            if (!table) {
                res.status(404).json({ success: false, message: 'Table not found or not in your club' });
                return;
            }
        }
        camera.tableId = tableId || camera.tableId;
        camera.IPAddress = IPAddress || camera.IPAddress;
        camera.username = username || camera.username;
        camera.password = password || camera.password;
        if (typeof isConnect === 'boolean') camera.isConnect = isConnect;
        await camera.save();
        res.json({ success: true, camera });
        return;
    } catch (error) {
        res.status(500).json({ success: false, message: 'Internal server error' });
        return;
    }
};

// Xóa camera
export const deleteCamera = async (req: Request & { manager?: any }, res: Response): Promise<void> => {
    try {
        const { cameraId } = req.params;
        const manager = req.manager;
        // Kiểm tra camera thuộc club của manager
        const camera = await Camera.findOneAndDelete({ cameraId });
        if (!camera) {
            res.status(404).json({ success: false, message: 'Camera not found' });
            return;
        }
        res.json({ success: true, message: 'Camera deleted' });
        return;
    } catch (error) {
        res.status(500).json({ success: false, message: 'Internal server error' });
        return;
    }
};