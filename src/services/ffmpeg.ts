import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

interface VideoToGifOptions {
  startTime: number;
  duration: number;
  fps: number;
  width: number;
}

type ProgressCallback = (progress: number) => void;

class FFmpegService {
  private ffmpeg: FFmpeg | null = null;
  private loaded = false;
  private loading = false;

  async load(): Promise<void> {
    if (this.loaded) return;
    if (this.loading) {
      // Wait for loading to complete
      while (this.loading) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      return;
    }

    this.loading = true;

    try {
      this.ffmpeg = new FFmpeg();
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';

      await this.ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });

      this.loaded = true;
    } catch (error) {
      console.error('Failed to load FFmpeg:', error);
      throw error;
    } finally {
      this.loading = false;
    }
  }

  isLoaded(): boolean {
    return this.loaded;
  }

  async videoToGif(
    videoFile: File | Blob,
    options: VideoToGifOptions,
    onProgress?: ProgressCallback
  ): Promise<Blob> {
    await this.load();

    if (!this.ffmpeg) {
      throw new Error('FFmpeg not initialized');
    }

    const { startTime, duration, fps, width } = options;

    // Write video file
    const inputName = 'input' + this.getExtension(videoFile);
    await this.ffmpeg.writeFile(inputName, await fetchFile(videoFile));

    // Set progress callback
    if (onProgress) {
      this.ffmpeg.on('progress', ({ progress }) => {
        onProgress(Math.min(progress, 1));
      });
    }

    // Execute conversion with optimized settings for GIF
    // Using palette generation for better quality
    await this.ffmpeg.exec([
      '-ss',
      String(startTime),
      '-t',
      String(duration),
      '-i',
      inputName,
      '-vf',
      `fps=${fps},scale=${width}:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse`,
      '-loop',
      '0',
      'output.gif',
    ]);

    // Read output
    const data = await this.ffmpeg.readFile('output.gif');

    // Cleanup
    await this.ffmpeg.deleteFile(inputName);
    await this.ffmpeg.deleteFile('output.gif');

    return new Blob([data], { type: 'image/gif' });
  }

  async extractFrame(videoFile: File | Blob, time: number): Promise<Blob> {
    await this.load();

    if (!this.ffmpeg) {
      throw new Error('FFmpeg not initialized');
    }

    const inputName = 'input' + this.getExtension(videoFile);
    await this.ffmpeg.writeFile(inputName, await fetchFile(videoFile));

    await this.ffmpeg.exec([
      '-ss',
      String(time),
      '-i',
      inputName,
      '-frames:v',
      '1',
      '-f',
      'image2',
      'frame.png',
    ]);

    const data = await this.ffmpeg.readFile('frame.png');

    // Cleanup
    await this.ffmpeg.deleteFile(inputName);
    await this.ffmpeg.deleteFile('frame.png');

    return new Blob([data], { type: 'image/png' });
  }

  async getVideoMetadata(
    videoFile: File | Blob
  ): Promise<{ duration: number; width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';

      video.onloadedmetadata = () => {
        resolve({
          duration: video.duration,
          width: video.videoWidth,
          height: video.videoHeight,
        });
        URL.revokeObjectURL(video.src);
      };

      video.onerror = () => {
        reject(new Error('Failed to load video metadata'));
        URL.revokeObjectURL(video.src);
      };

      video.src = URL.createObjectURL(videoFile);
    });
  }

  private getExtension(file: File | Blob): string {
    if (file instanceof File) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      return ext ? `.${ext}` : '.mp4';
    }
    return '.mp4';
  }
}

export const ffmpegService = new FFmpegService();
