import { Request, Response } from 'express';
import { Camera } from '../models/Camera.model';
import { Table } from '../models/Table.model';
import { MESSAGES } from '../config/messages';
import { CameraService } from '../services/Camera.service';

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


export const createCamera = async (req: Request & { manager?: any }, res: Response): Promise<void> => {
    try {
        const { tableId, IPAddress, username, password, isConnect = false } = req.body;
        const manager = req.manager;
        const table = await Table.findOne({ tableId, clubId: manager.clubId });
        if (!table) {
            res.status(404).json({ success: false, message: 'Bàn không tồn tại hoặc không thuộc club của bạn' });
            return;
        }
        const camera = await Camera.create({ tableId, IPAddress, username, password, isConnect });
        res.status(201).json({ success: true, message: MESSAGES.MSG52, camera });
        return;
    } catch (error) {
        res.status(500).json({ success: false, message: MESSAGES.MSG100 });
        return;
    }
};

export const updateCamera = async (req: Request & { manager?: any }, res: Response): Promise<void> => {
    try {
        const { cameraId } = req.params;
        const { tableId, IPAddress, username, password, isConnect, testConnection = true } = req.body;
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

        if (testConnection && (IPAddress || username || password)) {
            const testIP = IPAddress || camera.IPAddress;
            const testUsername = username || camera.username;
            const testPassword = password || camera.password;
            
            const result = await CameraService.testCameraConnection({
                IPAddress: testIP,
                username: testUsername,
                password: testPassword,
                port: '554'
            });

            if (result.success) {
                camera.isConnect = true;
            } else {
                camera.isConnect = false;
            }
        } else if (typeof isConnect === 'boolean') {
            camera.isConnect = isConnect;
        }

        camera.tableId = tableId || camera.tableId;
        camera.IPAddress = IPAddress || camera.IPAddress;
        camera.username = username || camera.username;
        camera.password = password || camera.password;
        
        await camera.save();
        
        res.json({ 
            success: true, 
            message: MESSAGES.MSG53, 
            camera,
            connectionTested: testConnection && (IPAddress || username || password)
        });
        return;
    } catch (error) {
        res.status(500).json({ success: false, message: MESSAGES.MSG100 });
        return;
    }
};

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

export const cameraConnection = async (req: Request & { manager?: any }, res: Response): Promise<void> => {
    try {
        const { IPAddress, username, password, port = '554', cameraId } = req.body;
        
        const result = await CameraService.testCameraConnection({
            IPAddress,
            username,
            password,
            port
        });

        if (result.success) {
            if (cameraId) {
                const manager = req.manager;
                const camera = await Camera.findOne({ cameraId });
                if (camera) {
                    const table = await Table.findOne({ tableId: camera.tableId, clubId: manager.clubId });
                    if (table) {
                        camera.isConnect = true;
                        await camera.save();
                    }
                }
            }

            res.json({
                success: true,
                message: result.message,
                cameraInfo: result.cameraInfo,
                isConnect: true,
                isConnectUpdated: !!cameraId
            });
        } else {
            res.status(400).json({
                success: false,
                message: result.message,
                error: result.error,
                isConnect: false
            });
        }
        return;
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi khi kiểm tra kết nối camera',
            error: error instanceof Error ? error.message : 'Unknown error',
            isConnect: false
        });
        return;
    }
};

export const startVideoStream = async (req: Request & { manager?: any }, res: Response): Promise<void> => {
    try {
        const { cameraId } = req.params;
        const manager = req.manager;
        
        const camera = await Camera.findOne({ cameraId });
        if (!camera) {
            res.status(404).json({ success: false, message: MESSAGES.MSG51 });
            return;
        }

        const table = await Table.findOne({ tableId: camera.tableId, clubId: manager.clubId });
        if (!table) {
            res.status(403).json({ success: false, message: 'Camera không thuộc quyền quản lý của bạn' });
            return;
        }

        const wsUrl = `ws://${req.get('host')}/api/stream?cameraId=${cameraId}`;
        
        res.json({
            success: true,
            message: 'Raw WebSocket stream đã sẵn sàng',
            wsUrl: wsUrl,
            cameraInfo: {
                cameraId: camera.cameraId,
                IPAddress: camera.IPAddress,
                tableId: camera.tableId
            }
        });
        return;
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi khi bắt đầu stream video',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        return;
    }
};

export const stopVideoStream = async (req: Request & { manager?: any }, res: Response): Promise<void> => {
    try {
        const { cameraId } = req.params;
        const manager = req.manager;
        
        const camera = await Camera.findOne({ cameraId });
        if (!camera) {
            res.status(404).json({ success: false, message: MESSAGES.MSG51 });
            return;
        }

        const table = await Table.findOne({ tableId: camera.tableId, clubId: manager.clubId });
        if (!table) {
            res.status(403).json({ success: false, message: 'Camera không thuộc quyền quản lý của bạn' });
            return;
        }

        const result = await CameraService.stopVideoStream(cameraId);
        
        res.json({
            success: true,
            message: 'Stream video đã được dừng'
        });
        return;
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi khi dừng stream video',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        return;
    }
};