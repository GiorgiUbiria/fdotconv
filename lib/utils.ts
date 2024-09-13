import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL, fetchFile } from '@ffmpeg/util';
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import pQueue from 'p-queue';
import path from 'path';

const conversionQueue = new pQueue({ concurrency: 3 });

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
        // Image-to-image conversion
        ffmpegCommand = [
          '-i',
          inputFileName,
          '-vf',
          "scale='min(1920,iw)':'-1'",
          outputFileName,
        ];
      } else {
        ffmpegCommand = ['-i', inputFileName, outputFileName];
      }

      console.log('FFmpeg command:', ffmpegCommand);

      await ffmpegClient.exec(ffmpegCommand);

      const convertedFile = await ffmpegClient.readFile(outputFileName);
      const mimeType = `image/${to}`;
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
    return ['jpeg', 'png', 'webp', 'avif'];
  } else if (fileType.startsWith('video/')) {
    return ['mp4', 'webm', 'avi', 'mov', 'mp3', 'wav', 'aac', 'ogg'];
  } else if (fileType.startsWith('audio/')) {
    return ['mp3', 'wav', 'ogg', 'aac'];
  }
  return [];
};

export async function convertVideoFile(file: File, to: string) {
  console.log(`Starting video conversion: ${file.name} to ${to}`);
  return conversionQueue.add(async () => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('format', to);

      console.log(`Sending conversion request to server: ${file.name}`);
      const response = await fetch('/api/convert', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `Server responded with an error: ${response.status} ${response.statusText}`
        );
        console.error(`Error details: ${errorText}`);
        throw new Error(
          `Conversion failed: ${response.status} ${response.statusText}`
        );
      }

      console.log(`Received response from server for ${file.name}`);
      const result = await response.json();
      if (result.error) {
        console.error(`Server reported an error: ${result.error}`);
        throw new Error(result.error);
      }

      if (!result.outputPath) {
        console.error('Server response is missing output path');
        throw new Error('Output path not provided');
      }

      const convertedFileUrl = `/api/converted/${path.basename(
        result.outputPath
      )}`;
      console.log(`Conversion successful: ${file.name} -> ${convertedFileUrl}`);

      return convertedFileUrl;
    } catch (error) {
      console.error('Error during file conversion:', error);
      if (error instanceof Error) {
        console.error(`Stack trace: ${error.stack}`);
        throw new Error(`File conversion failed: ${error.message}`);
      } else {
        console.error('Unknown error object:', error);
        throw new Error('File conversion failed due to an unknown error');
      }
    }
  });
}
