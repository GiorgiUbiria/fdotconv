import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';

export interface ConversionOptions {
  inputPath: string;
  outputPath: string;
  format: string;
  fileType: string;
  quality?: 'fast' | 'low' | 'medium' | 'high';
  onProgress?: (progress: number) => void;
}

export interface ConversionResult {
  success: boolean;
  outputPath?: string;
  error?: string;
  duration?: number;
}

export class FFmpegConverter {
  private ffmpegPath: string;
  private ffprobePath: string;
  private hwAccelSupport: { [key: string]: boolean } = {};
  private hwAccelTested = false;

  constructor() {
    this.ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
    this.ffprobePath = process.env.FFPROBE_PATH || 'ffprobe';
  }

  private async detectHardwareAcceleration(): Promise<void> {
    if (this.hwAccelTested) return;

    try {
      // Check for hardware acceleration support
      const encoders = await this.getAvailableEncoders();

      // Test actual hardware acceleration availability
      const hwTests = await Promise.allSettled([
        this.testHardwareAccel('vaapi', 'h264_vaapi'),
        this.testHardwareAccel('qsv', 'h264_qsv'),
        this.testHardwareAccel('nvenc', 'h264_nvenc'),
        this.testHardwareAccel('videotoolbox', 'h264_videotoolbox'),
      ]);

      this.hwAccelSupport = {
        nvenc: hwTests[2].status === 'fulfilled' && hwTests[2].value,
        vaapi: hwTests[0].status === 'fulfilled' && hwTests[0].value,
        qsv: hwTests[1].status === 'fulfilled' && hwTests[1].value,
        videotoolbox: hwTests[3].status === 'fulfilled' && hwTests[3].value,
      };

      console.log('Hardware acceleration support:', this.hwAccelSupport);
    } catch (error) {
      console.warn(
        'Could not detect hardware acceleration, using software only:',
        error
      );
      this.hwAccelSupport = {
        nvenc: false,
        vaapi: false,
        qsv: false,
        videotoolbox: false,
      };
    }

    this.hwAccelTested = true;
  }

  private async testHardwareAccel(
    type: string,
    encoder: string
  ): Promise<boolean> {
    return new Promise((resolve) => {
      // Create a simple test to see if hardware acceleration works
      const args = [
        '-f',
        'lavfi',
        '-i',
        'testsrc=duration=1:size=320x240:rate=1',
        '-t',
        '1',
      ];

      if (type === 'vaapi') {
        args.push(
          '-hwaccel',
          'vaapi',
          '-hwaccel_device',
          '/dev/dri/renderD128'
        );
      } else if (type === 'qsv') {
        args.push('-hwaccel', 'qsv');
      } else if (type === 'nvenc') {
        args.push('-hwaccel', 'cuda');
      } else if (type === 'videotoolbox') {
        args.push('-hwaccel', 'videotoolbox');
      }

      args.push('-c:v', encoder, '-f', 'null', '-');

      const ffmpeg = spawn(this.ffmpegPath, args, { stdio: 'pipe' });

      const timeout = setTimeout(() => {
        ffmpeg.kill();
        resolve(false);
      }, 3000);

      ffmpeg.on('close', (code) => {
        clearTimeout(timeout);
        resolve(code === 0);
      });

      ffmpeg.on('error', () => {
        clearTimeout(timeout);
        resolve(false);
      });
    });
  }

  private async getAvailableEncoders(): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const ffmpeg = spawn(this.ffmpegPath, ['-encoders']);
      let output = '';

      ffmpeg.stdout.on('data', (data) => {
        output += data.toString();
      });

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          const encoders =
            output
              .match(/^ V\..... (\w+)/gm)
              ?.map((line) => line.trim().split(' ').pop())
              .filter((encoder): encoder is string => encoder !== undefined) ||
            [];
          resolve(encoders);
        } else {
          reject(new Error('Failed to get encoders'));
        }
      });
    });
  }

  async getMediaInfo(inputPath: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const args = [
        '-v',
        'quiet',
        '-print_format',
        'json',
        '-show_format',
        '-show_streams',
        inputPath,
      ];

      const ffprobe = spawn(this.ffprobePath, args);
      let output = '';
      let error = '';

      ffprobe.stdout.on('data', (data) => {
        output += data.toString();
      });

      ffprobe.stderr.on('data', (data) => {
        error += data.toString();
      });

      ffprobe.on('close', (code) => {
        if (code === 0) {
          try {
            const info = JSON.parse(output);
            resolve(info);
          } catch (e) {
            reject(new Error('Failed to parse media info'));
          }
        } else {
          reject(new Error(`FFprobe failed: ${error}`));
        }
      });
    });
  }

  async convert(options: ConversionOptions): Promise<ConversionResult> {
    const {
      inputPath,
      outputPath,
      format,
      fileType,
      quality = 'medium',
      onProgress,
    } = options;

    try {
      // Ensure hardware acceleration is tested
      await this.detectHardwareAcceleration();

      // Get media info first
      const mediaInfo = await this.getMediaInfo(inputPath);
      const duration = parseFloat(mediaInfo.format?.duration || '0');

      // Build FFmpeg arguments based on conversion type
      const args = await this.buildFFmpegArgs(
        inputPath,
        outputPath,
        format,
        fileType,
        quality,
        mediaInfo
      );

      return new Promise((resolve, reject) => {
        const ffmpeg = spawn(this.ffmpegPath, args);
        let error = '';

        ffmpeg.stderr.on('data', (data) => {
          const output = data.toString();
          error += output;

          // Parse progress if callback provided
          if (onProgress && duration > 0) {
            const timeMatch = output.match(
              /time=(\d{2}):(\d{2}):(\d{2}\.\d{2})/
            );
            if (timeMatch) {
              const [, hours, minutes, seconds] = timeMatch;
              const currentTime =
                parseInt(hours) * 3600 +
                parseInt(minutes) * 60 +
                parseFloat(seconds);
              const progress = Math.min((currentTime / duration) * 100, 100);
              onProgress(progress);
            }
          }
        });

        ffmpeg.on('close', async (code) => {
          if (code === 0) {
            // Verify output file exists
            try {
              await fs.access(outputPath);
              resolve({
                success: true,
                outputPath,
                duration,
              });
            } catch {
              reject({
                success: false,
                error: 'Output file was not created',
              });
            }
          } else {
            reject({
              success: false,
              error: `FFmpeg failed with code ${code}: ${error}`,
            });
          }
        });

        ffmpeg.on('error', (err) => {
          reject({
            success: false,
            error: `FFmpeg process error: ${err.message}`,
          });
        });
      });
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  private async buildFFmpegArgs(
    inputPath: string,
    outputPath: string,
    format: string,
    fileType: string,
    quality: string,
    mediaInfo: any
  ): Promise<string[]> {
    const args = ['-i', inputPath];

    // Add overwrite flag
    args.push('-y');

    // Add threading optimization
    const cpuCount = os.cpus().length;
    args.push('-threads', Math.min(cpuCount, 8).toString());

    const isVideo = fileType.startsWith('video/');
    const isAudio = fileType.startsWith('audio/');
    const isImage = fileType.startsWith('image/');

    if (isImage) {
      return this.buildImageArgs(args, outputPath, format, quality);
    } else if (isVideo) {
      return this.buildVideoArgs(args, outputPath, format, quality, mediaInfo);
    } else if (isAudio) {
      return this.buildAudioArgs(args, outputPath, format, quality);
    }

    throw new Error(`Unsupported file type: ${fileType}`);
  }

  private buildImageArgs(
    args: string[],
    outputPath: string,
    format: string,
    quality: string
  ): string[] {
    // Image conversion settings
    switch (format.toLowerCase()) {
      case 'jpeg':
      case 'jpg':
        args.push(
          '-q:v',
          quality === 'high' ? '2' : quality === 'medium' ? '5' : '8'
        );
        break;
      case 'png':
        args.push(
          '-compression_level',
          quality === 'high' ? '1' : quality === 'medium' ? '6' : '9'
        );
        break;
      case 'webp':
        args.push(
          '-quality',
          quality === 'high' ? '90' : quality === 'medium' ? '75' : '60'
        );
        break;
    }

    // Scale down large images for better performance
    args.push('-vf', "scale='min(1920,iw)':'-1'");
    args.push(outputPath);
    return args;
  }

  private buildVideoArgs(
    args: string[],
    outputPath: string,
    format: string,
    quality: string,
    mediaInfo: any
  ): string[] {
    const audioFormats = ['mp3', 'wav', 'aac', 'ogg'];

    if (audioFormats.includes(format)) {
      // Video to audio conversion
      const audioStreams =
        mediaInfo.streams?.filter((s: any) => s.codec_type === 'audio') || [];
      if (audioStreams.length === 0) {
        throw new Error('Input video does not have an audio stream');
      }

      args.push('-vn'); // No video
      return this.buildAudioArgs(args, outputPath, format, quality);
    } else {
      // Video to video conversion with software-only encoding
      const videoStream = mediaInfo.streams?.find(
        (s: any) => s.codec_type === 'video'
      );
      const inputWidth = videoStream?.width || 1920;
      const inputHeight = videoStream?.height || 1080;

      // Optimized quality settings for speed - software encoding only
      const qualitySettings = {
        fast: { crf: '32', preset: 'ultrafast', speed: '8' },
        high: { crf: '20', preset: 'medium', speed: '1' },
        medium: { crf: '25', preset: 'fast', speed: '2' },
        low: { crf: '30', preset: 'veryfast', speed: '4' },
      };

      const settings = qualitySettings[quality as keyof typeof qualitySettings];

      switch (format.toLowerCase()) {
        case 'mp4':
          // Use software encoding only to avoid hardware acceleration issues
          args.push(
            '-c:v',
            'libx264',
            '-crf',
            settings.crf,
            '-preset',
            settings.preset
          );
          args.push('-profile:v', 'main', '-level', '4.0'); // Ensure compatibility
          args.push('-pix_fmt', 'yuv420p'); // Ensure compatibility
          args.push('-c:a', 'aac', '-b:a', '128k');
          break;

        case 'webm':
          // Use VP8 instead of VP9 for much faster encoding - software only
          args.push('-c:v', 'libvpx', '-crf', settings.crf, '-b:v', '0');
          args.push('-cpu-used', settings.speed); // Speed optimization for VP8
          args.push('-deadline', 'realtime'); // Real-time encoding mode
          args.push('-c:a', 'libvorbis', '-b:a', '128k');

          // Add tile-based encoding for better performance
          if (inputWidth >= 1280) {
            args.push('-tile-columns', '2');
          }
          break;

        case 'avi':
          // Software encoding only
          args.push(
            '-c:v',
            'libx264',
            '-crf',
            settings.crf,
            '-preset',
            settings.preset
          );
          args.push('-c:a', 'mp3', '-b:a', '128k');
          break;

        case 'mov':
          // Software encoding only
          args.push(
            '-c:v',
            'libx264',
            '-crf',
            settings.crf,
            '-preset',
            settings.preset
          );
          args.push('-pix_fmt', 'yuv420p'); // Ensure compatibility
          args.push('-c:a', 'aac', '-b:a', '128k');
          break;

        default:
          throw new Error(`Unsupported video format: ${format}`);
      }

      // Add resolution scaling for large videos to improve speed
      if (inputWidth > 1920 || inputHeight > 1080) {
        args.push(
          '-vf',
          "scale='min(1920,iw)':'min(1080,ih)':force_original_aspect_ratio=decrease"
        );
      }
    }

    args.push(outputPath);
    return args;
  }

  private buildAudioArgs(
    args: string[],
    outputPath: string,
    format: string,
    quality: string
  ): string[] {
    const qualitySettings = {
      high: { bitrate: '320k', vbrQuality: '0' },
      medium: { bitrate: '192k', vbrQuality: '2' },
      low: { bitrate: '128k', vbrQuality: '4' },
      fast: { bitrate: '128k', vbrQuality: '4' },
    };

    const settings = qualitySettings[quality as keyof typeof qualitySettings];

    switch (format.toLowerCase()) {
      case 'mp3':
        args.push(
          '-c:a',
          'libmp3lame',
          '-b:a',
          settings.bitrate,
          '-q:a',
          settings.vbrQuality
        );
        break;
      case 'wav':
        args.push('-c:a', 'pcm_s16le', '-ar', '44100', '-ac', '2');
        break;
      case 'aac':
        args.push('-c:a', 'aac', '-b:a', settings.bitrate);
        break;
      case 'ogg':
        args.push('-c:a', 'libvorbis', '-b:a', settings.bitrate);
        break;
      default:
        throw new Error(`Unsupported audio format: ${format}`);
    }

    args.push(outputPath);
    return args;
  }
}

export const ffmpegConverter = new FFmpegConverter();
