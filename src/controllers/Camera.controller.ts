import { Request, Response } from 'express';
import { Camera } from '../models/Camera.model';
import { Table } from '../models/Table.model';
import { MESSAGES } from '../config/messages';

// Lấy danh sách camera (theo club của manager)
export const listCameras = async (req: Request & { manager?: any }, res: Response): Promise<void> => {
    try {
        const manager = req.manager;
        const clubId = manager.clubId;
        const tables = await Table.find({ clubId });
        const tableIds = tables.map(t => t.tableId);
        const cameras = await Camera.find({ tableId: { $in: tableIds } });
        res.json({ success: true, cameras });
        return;
    } catch (error) {
        res.status(500).json({ success: false, message: MESSAGES.MSG100 });
        return;
    }
};

// Thêm camera
export const createCamera = async (req: Request & { manager?: any }, res: Response): Promise<void> => {
    try {
        const { tableId, IPAddress, username, password } = req.body;
        const manager = req.manager;
        const table = await Table.findOne({ tableId, clubId: manager.clubId });
        if (!table) {
            res.status(404).json({ success: false, message: 'Bàn không tồn tại hoặc không thuộc club của bạn' });
            return;
        }
        const camera = await Camera.create({ tableId, IPAddress, username, password });
        res.status(201).json({ success: true, camera });
        return;
    } catch (error) {
        res.status(500).json({ success: false, message: MESSAGES.MSG100 });
        return;
    }
};

// Sửa camera
export const updateCamera = async (req: Request & { manager?: any }, res: Response): Promise<void> => {
    try {
        const { cameraId } = req.params;
        const { tableId, IPAddress, username, password, isConnect } = req.body;
        const manager = req.manager;
        const camera = await Camera.findOne({ cameraId });
        if (!camera) {
            res.status(404).json({ success: false, message: MESSAGES.MSG51 });
            return;
        }
        if (tableId) {
            const table = await Table.findOne({ tableId, clubId: manager.clubId });
            if (!table) {
                res.status(404).json({ success: false, message: MESSAGES.MSG40 });
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
        res.status(500).json({ success: false, message: MESSAGES.MSG100 });
        return;
    }
};

// Xóa camera
export const deleteCamera = async (req: Request & { manager?: any }, res: Response): Promise<void> => {
    try {
        const { cameraId } = req.params;
        const manager = req.manager;
        const camera = await Camera.findOneAndDelete({ cameraId });
        if (!camera) {
            res.status(404).json({ success: false, message: MESSAGES.MSG51 });
            return;
        }
        res.json({ success: true, message: MESSAGES.MSG50 });
        return;
    } catch (error) {
        res.status(500).json({ success: false, message: MESSAGES.MSG100 });
        return;
    }
};