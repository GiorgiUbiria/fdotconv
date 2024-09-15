import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL, fetchFile } from '@ffmpeg/util';
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import pQueue from 'p-queue';
import path from 'path';
import { saveAs } from 'file-saver';

export const conversionQueue = new pQueue({ concurrency: 5 });

let ffmpegInstance: FFmpeg | null = null;

async function getFFmpegInstance(): Promise<FFmpeg> {
  if (!ffmpegInstance) {
    ffmpegInstance = await loadFfmpeg();
  }

  return ffmpegInstance;
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function loadFfmpeg(): Promise<FFmpeg> {
  const ffmpeg = new FFmpeg();
  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';

  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  });

  return ffmpeg;
}

function getFileNameAndExtension(file: File): {
  extension: string;
  name: string;
} {
  const parts = file.name.split('.');
  const extension = parts.pop() || '';
  const name = parts.join('.');

  if (!extension) {
    throw new Error('File has no extension');
  }

  return { extension, name };
}

export async function convertFile(file: File, to: string) {
  return conversionQueue.add(async () => {
    try {
      const ffmpegClient = await getFFmpegInstance();
      const { name, extension } = getFileNameAndExtension(file);

      const inputFileName = `${name}_${Date.now()}.${extension}`;
      const outputFileName = `${name}_${Date.now()}.${to}`;

      console.log(`Starting conversion: ${inputFileName} to ${outputFileName}`);

      await ffmpegClient.writeFile(inputFileName, await fetchFile(file));

      let ffmpegCommand: string[];

      if (file.type.startsWith('image/')) {
        ffmpegCommand = [
          '-i',
          inputFileName,
          '-vf',
          "scale='min(1920,iw)':'-1'",
          '-preset',
          'fast',
          '-y',
          outputFileName,
        ];
      } else {
        ffmpegCommand = [
          '-i',
          inputFileName,
          '-preset',
          'fast',
          '-y',
          outputFileName,
        ];
      }

      console.log('FFmpeg command:', ffmpegCommand);

      await ffmpegClient.exec(ffmpegCommand);

      const convertedFile = await ffmpegClient.readFile(outputFileName);

      let mimeType = `image/${to}`;
      if (to === 'jpeg') mimeType = 'image/jpeg';
      else if (to === 'png') mimeType = 'image/png';
      else if (to === 'webp') mimeType = 'image/webp';
      else if (to === 'avif') mimeType = 'image/avif';
      else if (to === 'gif') mimeType = 'image/gif';
      else if (to === 'bmp') mimeType = 'image/bmp';
      else if (to === 'tiff') mimeType = 'image/tiff';

      const blob = new Blob([convertedFile], { type: mimeType });
      const url = URL.createObjectURL(blob);

      await ffmpegClient.deleteFile(inputFileName);
      await ffmpegClient.deleteFile(outputFileName);

      console.log(
        `Conversion completed: ${inputFileName} to ${outputFileName}`
      );

      return url;
    } catch (error) {
      console.error('Error during file conversion:', error);
      if (error instanceof Error) {
        throw new Error(`File conversion failed: ${error.message}`);
      } else {
        throw new Error('File conversion failed due to an unknown error');
      }
    }
  });
}

export const getConversionOptions = (fileType: string) => {
  if (fileType.startsWith('image/')) {
    return ['jpeg', 'png', 'webp', 'gif', 'bmp', 'tiff'];
  } else if (fileType.startsWith('video/')) {
    return ['mp4', 'webm', 'avi', 'mov', 'mp3', 'wav', 'aac', 'ogg'];
  } else if (fileType.startsWith('audio/')) {
    return ['mp3', 'wav', 'ogg', 'aac'];
  }
  return [];
};

export function downloadFile(url: string, fileName: string) {
  saveAs(url, fileName);
}
