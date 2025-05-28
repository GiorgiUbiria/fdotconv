import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import pQueue from 'p-queue';
import { saveAs } from 'file-saver';

export const conversionQueue = new pQueue({ concurrency: 5 });

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getConversionOptions = (fileType: string) => {
  if (fileType.startsWith('image/')) {
    return ['jpeg', 'png', 'webp', 'gif', 'bmp', 'tiff', 'avif'];
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

export async function convertFile(
  file: File,
  format: string,
  quality: 'fast' | 'low' | 'medium' | 'high' = 'medium',
  onProgress?: (progress: number) => void
): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('format', format);
  formData.append('quality', quality);

  // Start progress tracking with polling
  let progressInterval: NodeJS.Timeout | null = null;
  let isCompleted = false;

  if (onProgress) {
    const pollProgress = async () => {
      try {
        const response = await fetch(
          `/api/progress/${encodeURIComponent(file.name)}`
        );
        if (response.ok) {
          const data = await response.json();
          console.log(`Progress polling for ${file.name}:`, data);
          if (
            data.fileName === file.name &&
            typeof data.progress === 'number'
          ) {
            onProgress(data.progress);

            // Stop polling if conversion is complete or no longer active
            if (data.progress >= 100 || !data.isActive || isCompleted) {
              console.log(
                `Stopping progress polling for ${file.name} - progress: ${data.progress}, isActive: ${data.isActive}, isCompleted: ${isCompleted}`
              );
              if (progressInterval) {
                clearInterval(progressInterval);
                progressInterval = null;
              }
            }
          }
        } else {
          console.warn(
            `Progress polling failed for ${file.name}:`,
            response.status,
            response.statusText
          );
        }
      } catch (e) {
        console.warn('Failed to fetch progress:', e);
      }
    };

    console.log(`Starting progress polling for ${file.name}`);

    // Start with a small delay to ensure server has initialized progress tracking
    setTimeout(() => {
      if (!isCompleted) {
        // Start polling every 500ms
        progressInterval = setInterval(pollProgress, 500);
        // Initial progress check
        pollProgress();
      }
    }, 200); // 200ms delay
  }

  try {
    console.log(`Starting conversion for ${file.name}`);
    const response = await fetch('/api/convert', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || `Conversion failed with status ${response.status}`
      );
    }

    const blob = await response.blob();
    isCompleted = true;
    console.log(`Conversion completed for ${file.name}`);

    if (onProgress) {
      onProgress(100);
    }

    return URL.createObjectURL(blob);
  } finally {
    // Clean up polling interval
    if (progressInterval) {
      console.log(`Cleaning up progress polling for ${file.name}`);
      clearInterval(progressInterval);
    }
    isCompleted = true;
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

export function isValidFileType(fileType: string): boolean {
  const supportedTypes = ['image/', 'video/', 'audio/'];

  return supportedTypes.some((type) => fileType.startsWith(type));
}

export function getMaxFileSize(): number {
  // 100MB max file size
  return 100 * 1024 * 1024;
}

export const qualityOptions = [
  {
    value: 'fast',
    label: 'Fast',
    description: 'Quick conversion, good quality',
  },
  {
    value: 'low',
    label: 'Low',
    description: 'Faster conversion, lower quality',
  },
  {
    value: 'medium',
    label: 'Medium',
    description: 'Balanced speed and quality',
  },
  {
    value: 'high',
    label: 'High',
    description: 'Best quality, slower conversion',
  },
] as const;
