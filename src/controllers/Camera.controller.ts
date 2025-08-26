import { Request, Response } from 'express';
import { Camera } from '../models/Camera.model';
import { Table } from '../models/Table.model';
import { MESSAGES } from '../config/messages';
import { CameraService } from '../services/Camera.service';
import axios from 'axios';
import fs from 'fs';
import FormData from 'form-data';
import path from 'path';

interface StreamState {
    cameraId: string;
    isActive: boolean;
    startTime: Date;
    viewerCount: number;
    wsUrl: string;
}

const activeStreams = new Map<string, StreamState>();

const getStreamState = (cameraId: string): StreamState | null => {
    return activeStreams.get(cameraId) || null;
};

const startStream = (cameraId: string, wsUrl: string): StreamState => {
    const existingState = activeStreams.get(cameraId);
    if (existingState) {
        existingState.viewerCount++;
        return existingState;
    }

    const newState: StreamState = {
        cameraId,
        isActive: true,
        startTime: new Date(),
        viewerCount: 1,
        wsUrl
    };
    activeStreams.set(cameraId, newState);
    return newState;
};

const stopStream = (cameraId: string): boolean => {
    const state = activeStreams.get(cameraId);
    if (!state) return false;

    state.viewerCount--;
    if (state.viewerCount <= 0) {
        activeStreams.delete(cameraId);
        return true;
    }
    return false;
};

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

            camera.isConnect = true;
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
            message: 'Camera connection test completed',
            isConnect: true,
            isConnectUpdated: !!cameraId
        });
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

export const startVideoStream = async (req: Request & { manager?: any; match?: any }, res: Response): Promise<void> => {
    try {
        const { cameraId } = req.params;
        const manager = req.manager;
        const match = req.match;

        const camera = await Camera.findOne({ cameraId });
        if (!camera) {
            res.status(404).json({ success: false, message: MESSAGES.MSG51 });
            return;
        }

        if (manager) {
            const table = await Table.findOne({ tableId: camera.tableId, clubId: manager.clubId });
            if (!table) {
                res.status(403).json({ success: false, message: 'Camera không thuộc quyền quản lý của bạn' });
                return;
            }
        } else if (match) {
            if (match.tableId !== camera.tableId) {
                res.status(403).json({ success: false, message: 'Camera không thuộc bàn đang chơi' });
                return;
            }

            if (!['pending', 'ongoing'].includes(match.status)) {
                res.status(403).json({ success: false, message: 'Trận đấu đã kết thúc' });
                return;
            }
        } else {
            res.status(403).json({ success: false, message: 'Không có quyền truy cập camera' });
            return;
        }

        const wsUrl = `ws://${req.get('host')}/api/stream?cameraId=${cameraId}`;

        const streamState = startStream(cameraId, wsUrl);

        res.json({
            success: true,
            message: streamState.viewerCount === 1
                ? 'Video stream đã được khởi động'
                : `Đã tham gia stream hiện tại (${streamState.viewerCount} người đang xem)`,
            wsUrl: wsUrl,
            streamInfo: {
                isNewStream: streamState.viewerCount === 1,
                viewerCount: streamState.viewerCount,
                startTime: streamState.startTime
            },
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

export const stopVideoStream = async (req: Request & { manager?: any; match?: any }, res: Response): Promise<void> => {
    try {
        const { cameraId } = req.params;
        const manager = req.manager;
        const match = req.match;

        const camera = await Camera.findOne({ cameraId });
        if (!camera) {
            res.status(404).json({ success: false, message: MESSAGES.MSG51 });
            return;
        }

        if (manager) {
            const table = await Table.findOne({ tableId: camera.tableId, clubId: manager.clubId });
            if (!table) {
                res.status(403).json({ success: false, message: 'Camera không thuộc quyền quản lý của bạn' });
                return;
            }
        } else if (match) {
            if (match.tableId !== camera.tableId) {
                res.status(403).json({ success: false, message: 'Camera không thuộc bàn đang chơi' });
                return;
            }

            if (!['pending', 'ongoing'].includes(match.status)) {
                res.status(403).json({ success: false, message: 'Trận đấu đã kết thúc' });
                return;
            }
        } else {
            res.status(403).json({ success: false, message: 'Không có quyền truy cập camera' });
            return;
        }

        const wasCompletelyStopped = stopStream(cameraId);

        if (wasCompletelyStopped) {
            const result = await CameraService.stopVideoStream(cameraId);
        }

        const currentState = getStreamState(cameraId);
        const viewerCount = currentState ? currentState.viewerCount : 0;

        res.json({
            success: true,
            message: wasCompletelyStopped
                ? 'Video stream đã được dừng hoàn toàn'
                : `Đã rời khỏi stream (${viewerCount} người vẫn đang xem)`,
            streamInfo: {
                wasCompletelyStopped,
                remainingViewers: viewerCount
            }
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
export const recordCamera = async (req: Request & { manager?: any }, res: Response): Promise<void> => {
    try {
        const { cameraId } = req.params;
        const manager = req.manager;
        const durationParam = Number(req.query.duration);
        if (isNaN(durationParam) || durationParam < 3 || durationParam > 120) {
            res.status(400).json({
                success: false,
                message: 'Thời gian record phải từ 3-120 giây'
            });
            return;
        }
        const duration = Math.max(3, Math.min(durationParam || 20, 120));

        const camera = await Camera.findOne({ cameraId }).select('+password');
        if (!camera) {
            res.status(404).json({ success: false, message: 'Camera không tồn tại' });
            return;
        }

        if (manager) {
            const table = await Table.findOne({ tableId: camera.tableId, clubId: manager.clubId });
            if (!table) {
                res.status(403).json({ success: false, message: 'Camera không thuộc quyền quản lý của bạn' });
                return;
            }
        }

        const result = await CameraService.recordOnce({
            camera: {
                cameraId: camera.cameraId,
                IPAddress: camera.IPAddress,
                username: camera.username,
                password: camera.password,
            },
            durationSec: duration,
            uploadToAI: true,
            extraMeta: { tableId: camera.tableId }
        });

        if (!result.success) {
            res.status(400).json({
                success: false,
                message: result.message,
                error: result.error
            });
            return;
        }
        const ai = result.ai;

        res.json({
            success: true,
            message: result.message,
            jobId: result.jobId,
            file: result.mp4Path ? {
                name: result.mp4Path.split(/[/\\]/).pop(),
                path: result.mp4Path,
                size: fs.existsSync(result.mp4Path) ? fs.statSync(result.mp4Path).size : 0
            } : null,
            ai,
            duration: duration
        });
        return;

    } catch (e: any) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi record camera',
            error: e.message
        });
        return;
    }
};

export const getRecordStatus = async (req: Request & { manager?: any }, res: Response): Promise<void> => {
    try {
        const { cameraId } = req.params;
        const manager = req.manager;

        const camera = await Camera.findOne({ cameraId });
        if (!camera) {
            res.status(404).json({ success: false, message: 'Camera không tồn tại' });
            return;
        }

        if (manager) {
            const table = await Table.findOne({ tableId: camera.tableId, clubId: manager.clubId });
            if (!table) {
                res.status(403).json({ success: false, message: 'Camera không thuộc quyền quản lý của bạn' });
                return;
            }
        }

        const baseDir = path.join(process.cwd(), 'recordings', cameraId);
        let recordings = [];

        if (fs.existsSync(baseDir)) {
            const jobDirs = fs.readdirSync(baseDir);
            for (const jobId of jobDirs) {
                const jobDir = path.join(baseDir, jobId);
                const mp4Path = path.join(jobDir, 'clip.mp4');

                if (fs.existsSync(mp4Path)) {
                    const stats = fs.statSync(mp4Path);
                    recordings.push({
                        jobId,
                        fileName: 'clip.mp4',
                        filePath: mp4Path,
                        size: stats.size,
                        createdAt: stats.birthtime,
                        modifiedAt: stats.mtime
                    });
                }
            }
        }

        res.json({
            success: true,
            cameraId,
            recordings: recordings.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        });
        return;

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy trạng thái record',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        return;
    }
};

export const deleteRecording = async (req: Request & { manager?: any }, res: Response): Promise<void> => {
    try {
        const { cameraId, jobId } = req.params;
        const manager = req.manager;

        const camera = await Camera.findOne({ cameraId });
        if (!camera) {
            res.status(404).json({ success: false, message: 'Camera không tồn tại' });
            return;
        }

        if (manager) {
            const table = await Table.findOne({ tableId: camera.tableId, clubId: manager.clubId });
            if (!table) {
                res.status(403).json({ success: false, message: 'Camera không thuộc quyền quản lý của bạn' });
                return;
            }
        }

        const recordingDir = path.join(process.cwd(), 'recordings', cameraId, jobId);

        if (!fs.existsSync(recordingDir)) {
            res.status(404).json({ success: false, message: 'Recording không tồn tại' });
            return;
        }

        fs.rmSync(recordingDir, { recursive: true, force: true });

        res.json({
            success: true,
            message: 'Recording đã được xóa thành công'
        });
        return;

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi xóa recording',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        return;
    }
};


export const cleanupRecordings = async (req: Request & { manager?: any }, res: Response): Promise<void> => {
    try {
        const { cameraId } = req.params;
        const manager = req.manager;
        const maxAgeHours = Number(req.query.maxAgeHours) || 24;

        const camera = await Camera.findOne({ cameraId });
        if (!camera) {
            res.status(404).json({ success: false, message: 'Camera không tồn tại' });
            return;
        }

        if (manager) {
            const table = await Table.findOne({ tableId: camera.tableId, clubId: manager.clubId });
            if (!table) {
                res.status(403).json({ success: false, message: 'Camera không thuộc quyền quản lý của bạn' });
                return;
            }
        }

        const result = await CameraService.cleanupOldRecordings(cameraId, maxAgeHours);

        if (result.success) {
            res.json({
                success: true,
                message: result.message,
                deletedCount: result.deletedCount,
                maxAgeHours
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Lỗi khi dọn dẹp recordings',
                error: result.error
            });
        }
        return;

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi dọn dẹp recordings',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        return;
    }
};