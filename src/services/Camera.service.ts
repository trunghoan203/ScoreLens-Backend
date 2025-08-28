import axios from 'axios';
import { spawn } from 'child_process';
import { promisify } from 'util';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

const execAsync = promisify(exec);



export class CameraService {
  private static rtspPatterns = [
    'rtsp://{username}:{password}@{ip}:{port}/cam/realmonitor?channel=1&subtype=0',
    'rtsp://{username}:{password}@{ip}:{port}/Streaming/Channels/101',
    'rtsp://{username}:{password}@{ip}:{port}/live/ch0',
    'rtsp://{username}:{password}@{ip}:{port}/live/ch00_0',
    'rtsp://{username}:{password}@{ip}:{port}/live/ch1',
    'rtsp://{username}:{password}@{ip}:{port}/live/ch01_0',
    'rtsp://{username}:{password}@{ip}:{port}/live/av0',
    'rtsp://{username}:{password}@{ip}:{port}/live/av1',
    'rtsp://{username}:{password}@{ip}:{port}/live',
    'rtsp://{username}:{password}@{ip}:{port}/live/0',
    'rtsp://{username}:{password}@{ip}:{port}/live/1',
    'rtsp://{username}:{password}@{ip}:{port}/cam/realmonitor?channel=1&subtype=1',
    'rtsp://{username}:{password}@{ip}:{port}/cam/realmonitor?channel=1&subtype=2',
    'rtsp://{username}:{password}@{ip}:{port}/cam/realmonitor?channel=1&subtype=3'
];



  private static async testRTSPConnection(rtspUrl: string): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const ffprobe = spawn('ffprobe', [
          '-v', 'error',
          '-print_format', 'json',
          '-show_format',
          '-show_streams',
          '-timeout', '5000000',
          '-rtsp_transport', 'tcp',
          rtspUrl
        ]);

        let hasOutput = false;
        let hasError = false;

        ffprobe.stdout.on('data', (data) => {
          hasOutput = true;
        });

        ffprobe.stderr.on('data', (data) => {
          const errorMsg = data.toString();
          
          if (errorMsg.includes('error') || errorMsg.includes('Invalid') || 
              errorMsg.includes('Connection refused') || errorMsg.includes('Connection timed out') ||
              errorMsg.includes('No route to host') || errorMsg.includes('Network is unreachable')) {
            hasError = true;
          }
        });

        ffprobe.on('close', (code) => {
          setTimeout(() => {
            if (!hasOutput && !hasError) {
              resolve(false);
            }
          }, 8000);

          if (code === 0 && hasOutput && !hasError) {
            resolve(true);
          } else {
            resolve(false);
          }
        });

        ffprobe.on('error', () => {
          resolve(false);
        });

      } catch (error) {
        resolve(false);
      }
    });
  }



  static async startVideoStream(camera: any): Promise<{ success: boolean; streamUrl?: string; message?: string; error?: string }> {
    try {
      const rtspUrl = `rtsp://${camera.username}:${camera.password}@${camera.IPAddress}:554/cam/realmonitor?channel=1&subtype=0`;
      const testResult = await this.testRTSPConnection(rtspUrl);
      if (!testResult) {
        return {
          success: false,
          message: 'Không thể kết nối đến camera',
          error: 'RTSP connection failed'
        };
      }
      const streamUrl = `ws://localhost:8000/api/stream?cameraId=${camera.cameraId}`;
      
      return {
        success: true,
        streamUrl,
        message: 'Stream video đã sẵn sàng'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Lỗi khi bắt đầu stream video',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  static async stopVideoStream(cameraId: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      return {
        success: true,
        message: 'Stream video đã được dừng'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Lỗi khi dừng stream video',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  static async recordOnce(opts: {
    camera: { cameraId: string; IPAddress: string; username: string; password: string };
    durationSec: number;           
    baseDir?: string;
    uploadToAI?: boolean;
    extraMeta?: Record<string, any>;
  }): Promise<{ success: boolean; jobId?: string; mp4Path?: string; message?: string; error?: string; ai?: any }> {
    const { camera, durationSec } = opts;
    const duration = Math.max(3, Math.min(durationSec || 20, 120));

    try {
      await execAsync('ffmpeg -version');
    } catch (error) {
      return { 
        success: false, 
        message: 'FFmpeg không được cài đặt hoặc không có trong PATH', 
        error: 'FFmpeg not found' 
      };
    }

    const rtspUrls = [
      `rtsp://${encodeURIComponent(camera.username)}:${encodeURIComponent(camera.password)}@${camera.IPAddress}:554/cam/realmonitor?channel=1&subtype=0`,
      `rtsp://${encodeURIComponent(camera.username)}:${encodeURIComponent(camera.password)}@${camera.IPAddress}:554/Streaming/Channels/101`,
      `rtsp://${encodeURIComponent(camera.username)}:${encodeURIComponent(camera.password)}@${camera.IPAddress}:554/live/ch0`,
      `rtsp://${encodeURIComponent(camera.username)}:${encodeURIComponent(camera.password)}@${camera.IPAddress}:554/live/av0`,
      `rtsp://${encodeURIComponent(camera.username)}:${encodeURIComponent(camera.password)}@${camera.IPAddress}:554/live`
    ];

    let workingRtspUrl = null;
    
    for (let i = 0; i < rtspUrls.length; i++) {
      const rtspUrl = rtspUrls[i];
      
      const ok = await this.testRTSPConnection(rtspUrl);
      if (ok) {
        workingRtspUrl = rtspUrl;
        break;
      }
    }

    if (!workingRtspUrl) {
      return { 
        success: false, 
        message: 'Không thể kết nối RTSP để record', 
        error: 'RTSP connection failed' 
      };
    }

    const jobId = randomUUID();
    const baseDir = opts.baseDir || path.join(process.cwd(), 'recordings');
    const outDir = path.join(baseDir, camera.cameraId, jobId);
    
    try {
      if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
      }
    } catch (error) {
      return { 
        success: false, 
        message: 'Không thể tạo thư mục record', 
        error: error instanceof Error ? error.message : 'Directory creation failed' 
      };
    }

    const mkvPath = path.join(outDir, 'clip.mkv');
    const mp4Path = path.join(outDir, 'clip.mp4');

    const recArgs = [
      '-rtsp_transport', 'tcp',
      '-timeout', '5000000',
      '-i', workingRtspUrl,
      '-t', String(duration),
      '-c:v', 'copy',
      '-c:a', 'copy',
      '-avoid_negative_ts', 'make_zero',
      '-f', 'matroska',
      mkvPath
    ];

    try {
      await new Promise<void>((resolve, reject) => {
        const p = spawn('ffmpeg', recArgs);
        let err = '';
        let hasError = false;
        
        p.stderr.on('data', (d) => { 
          const data = d.toString();
          err += data;
          
          if (data.includes('error') || data.includes('Invalid') || data.includes('Connection refused')) {
            hasError = true;
          }
        });
        
        p.on('error', (e) => {
          reject(e);
        });
        
        p.on('close', (code) => {
          if (code === 0 && fs.existsSync(mkvPath) && !hasError) {
            resolve();
          } else {
            reject(new Error(err || `ffmpeg exit ${code}`));
          }
        });
        
        setTimeout(() => {
          p.kill('SIGKILL');
          reject(new Error('Record timeout'));
        }, (duration + 10) * 1000);
      });
    } catch (e: any) {
      return { 
        success: false, 
        message: 'Record thất bại', 
        error: e.message || String(e) 
      };
    }

    try {
      await new Promise<void>((resolve, reject) => {
        const p = spawn('ffmpeg', [
          '-i', mkvPath, 
          '-c', 'copy', 
          '-movflags', '+faststart', 
          mp4Path
        ]);
        let err = '';
        
        p.stderr.on('data', (d) => { err += d.toString(); });
        p.on('error', (e) => reject(e));
        p.on('close', (code) => {
          if (code === 0 && fs.existsSync(mp4Path)) {
            resolve();
          } else {
            reject(new Error(err || `remux exit ${code}`));
          }
        });
      });
    } catch (e: any) {
      try { 
        if (fs.existsSync(mkvPath)) fs.unlinkSync(mkvPath); 
      } catch {}
      
      return { 
        success: false, 
        message: 'Chuyển đổi MP4 thất bại', 
        error: e.message || String(e) 
      };
    }

    try { 
      if (fs.existsSync(mkvPath)) fs.unlinkSync(mkvPath); 
    } catch {}

    if (!fs.existsSync(mp4Path) || fs.statSync(mp4Path).size === 0) {
      return { 
        success: false, 
        message: 'File record không hợp lệ', 
        error: 'Invalid output file' 
      };
    }

    let aiResult = null;
    if (opts.uploadToAI && process.env.AI_UPLOAD_URL && fs.existsSync(mp4Path)) {
      try {
        const fileBuffer = fs.readFileSync(mp4Path);
        const form = new FormData();
        form.append('file', new Blob([fileBuffer], { type: 'video/mp4' }), 'clip.mp4');
        form.append('cameraId', camera.cameraId);
        form.append('duration', String(duration));
        
        if (opts.extraMeta) {
          for (const [key, value] of Object.entries(opts.extraMeta)) {
            form.append(key, typeof value === 'string' ? value : JSON.stringify(value));
          }
        }

        const headers = { 
          ...(process.env.AI_API_KEY ? { Authorization: `Bearer ${process.env.AI_API_KEY}` } : {})
        };

        const timeout = Number(process.env.AI_TIMEOUT_MS || 60000);
        const response = await axios.post(process.env.AI_UPLOAD_URL, form, { headers, timeout });
        aiResult = response.data;
      } catch (error) {
        aiResult = { 
          success: false, 
          message: 'AI upload failed', 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    }

    return { 
      success: true, 
      jobId, 
      mp4Path, 
      message: `Record thành công - ${duration} giây`,
      ai: aiResult
    };
  }

  static async cleanupOldRecordings(cameraId: string, maxAgeHours: number = 24): Promise<{ success: boolean; deletedCount: number; message?: string; error?: string }> {
    try {
      const baseDir = path.join(process.cwd(), 'recordings', cameraId);
      if (!fs.existsSync(baseDir)) {
        return { success: true, deletedCount: 0, message: 'Không có thư mục recordings' };
      }

      const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
      const now = Date.now();
      let deletedCount = 0;

      const jobDirs = fs.readdirSync(baseDir);
      for (const jobId of jobDirs) {
        const jobDir = path.join(baseDir, jobId);
        const mp4Path = path.join(jobDir, 'clip.mp4');
        
        if (fs.existsSync(mp4Path)) {
          const stats = fs.statSync(mp4Path);
          const ageMs = now - stats.mtime.getTime();
          
          if (ageMs > maxAgeMs) {
            try {
              fs.rmSync(jobDir, { recursive: true, force: true });
              deletedCount++;
            } catch (error) {
            }
          }
        }
      }

      return { 
        success: true, 
        deletedCount, 
        message: `Đã xóa ${deletedCount} recording cũ` 
      };

    } catch (error) {
      return { 
        success: false, 
        deletedCount: 0, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}
