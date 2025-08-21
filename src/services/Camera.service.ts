import axios from 'axios';
import { spawn } from 'child_process';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

export interface CameraTestConfig {
  IPAddress: string;
  username: string;
  password: string;
  port?: string;
}

export interface CameraTestResult {
  success: boolean;
  message: string;
  cameraInfo?: {
    model?: string;
    resolution?: string;
    fps?: number;
    rtspUrl: string;
  };
  error?: string;
}

export class CameraService {
  private static rtspPatterns = [
    'rtsp://{username}:{password}@{ip}:{port}/cam/realmonitor?channel=1&subtype=0',
    'rtsp://{username}:{password}@{ip}:{port}/Streaming/Channels/101'
];

  static async testCameraConnection(config: CameraTestConfig): Promise<CameraTestResult> {
    const { IPAddress, username, password, port } = config;
    const portValue = port || '554';

    try {
      const pingResult = await this.pingCamera(IPAddress);
      if (!pingResult.success) {
        return {
          success: false,
          message: 'Không thể kết nối đến camera',
          error: `Ping failed: ${pingResult.error}`
        };
      }

      const rtspResult = await this.testRTSPUrls(IPAddress, username, password, portValue);
      if (!rtspResult.success) {
        return {
          success: false,
          message: 'Không thể kết nối RTSP',
          error: rtspResult.error
        };
      }

      return {
        success: true,
        message: 'Kết nối camera thành công',
        cameraInfo: {
          rtspUrl: rtspResult.rtspUrl!,
          resolution: '1920x1080',
          fps: 30
        }
      };

    } catch (error) {
      return {
        success: false,
        message: 'Lỗi khi test camera',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private static async pingCamera(ip: string): Promise<{ success: boolean; error?: string }> {
    try {
      const platform = process.platform;
      const pingCommand = platform === 'win32' ? `ping -n 1 ${ip}` : `ping -c 1 ${ip}`;
      
      const { stdout, stderr } = await execAsync(pingCommand, { timeout: 5000 });
      
      if (stderr || !stdout.includes('TTL=') && !stdout.includes('ttl=')) {
        return { success: false, error: 'Ping failed' };
      }
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Ping timeout' 
      };
    }
  }

  private static async testRTSPUrls(
    ip: string, 
    username: string, 
    password: string, 
    port: string
  ): Promise<{ success: boolean; rtspUrl?: string; error?: string }> {
    
    for (const pattern of this.rtspPatterns) {
      const rtspUrl = pattern
        .replace('{username}', username)
        .replace('{password}', password)
        .replace('{ip}', ip)
        .replace('{port}', port);

      try {
        const isConnectable = await this.testRTSPConnection(rtspUrl);
        if (isConnectable) {
          return { success: true, rtspUrl };
        }
      } catch (error) {
        continue;
      }
    }

    return { 
      success: false, 
      error: 'Không tìm thấy RTSP URL hợp lệ' 
    };
  }

  private static async testRTSPConnection(rtspUrl: string): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const ffprobe = spawn('ffprobe', [
          '-v', 'quiet',
          '-print_format', 'json',
          '-show_format',
          '-show_streams',
          rtspUrl
        ]);

        let hasOutput = false;
        let hasError = false;

        ffprobe.stdout.on('data', (data) => {
          hasOutput = true;
        });

        ffprobe.stderr.on('data', (data) => {
          if (data.toString().includes('error') || data.toString().includes('Invalid')) {
            hasError = true;
          }
        });

        ffprobe.on('close', (code) => {
          setTimeout(() => {
            if (!hasOutput && !hasError) {
              resolve(false);
            }
          }, 10000);

          if (code === 0 && hasOutput) {
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
}
