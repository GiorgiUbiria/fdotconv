import { Hono } from 'hono';
import { handle } from 'hono/vercel';
import fs from 'fs/promises';
import tmp from 'tmp';
import path from 'path';
import { createWriteStream } from 'fs';
import { Readable } from 'stream';
import { z } from 'zod';
import mime from 'mime-types';
import { ffmpegConverter } from '@/lib/ffmpeg';
import { conversionQueue } from '@/lib/utils';
import { performanceMonitor } from '@/lib/performance-monitor';

const app = new Hono().basePath('/api');

// Store active conversion progress
const conversionProgress = new Map<string, number>();

app.post('/convert', async (c) => {
  console.log('Received conversion request');
  
  let fileName = 'unknown';
  
  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    const format = formData.get('format') as string;
    const quality = (formData.get('quality') as string) || 'medium';
    
    if (!file || !format) {
      return c.json({ error: 'Missing file or format' }, 400);
    }

    const { name, type: fileType, size } = file;
    fileName = name; // Store for error handling
    
    // Validate file size (100MB limit)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (size > maxSize) {
      return c.json({ error: 'File size exceeds 100MB limit' }, 400);
    }

    // Validate file type
    const supportedTypes = ['image/', 'video/', 'audio/'];
    if (!supportedTypes.some(type => fileType.startsWith(type))) {
      return c.json({ error: 'Unsupported file type' }, 400);
    }

    // Validate quality
    if (!['fast', 'low', 'medium', 'high'].includes(quality)) {
      return c.json({ error: 'Invalid quality setting' }, 400);
    }

    console.log(`Processing file: ${name} (${fileType}) to format: ${format} with quality: ${quality}`);

    // Initialize progress tracking IMMEDIATELY before any async processing
    conversionProgress.set(name, 0);
    console.log(`Progress tracking initialized for ${name}`);

    // Start performance monitoring
    const inputFormat = path.extname(name).slice(1) || 'unknown';
    performanceMonitor.startConversion(name, size, inputFormat, format, quality);

    // Create temporary files
    const inputExt = path.extname(name);
    const tmpInputFile = tmp.fileSync({ 
      postfix: inputExt,
      prefix: 'input_'
    });
    
    const tmpOutputFile = tmp.fileSync({ 
      postfix: `.${format}`,
      prefix: 'output_'
    });

    try {
      // Write uploaded file to temporary location
      const fileBuffer = await file.arrayBuffer();
      const readStream = Readable.from(Buffer.from(fileBuffer));
      const writeStream = createWriteStream(tmpInputFile.name);

      await new Promise((resolve, reject) => {
        readStream
          .pipe(writeStream)
          .on('finish', resolve)
          .on('error', reject);
      });

      console.log('File written to temporary location, starting conversion');

      // Add conversion to queue and process
      const result = await conversionQueue.add(async () => {
        return ffmpegConverter.convert({
          inputPath: tmpInputFile.name,
          outputPath: tmpOutputFile.name,
          format,
          fileType,
          quality: quality as 'fast' | 'low' | 'medium' | 'high',
          onProgress: (progress) => {
            console.log(`Conversion progress: ${progress.toFixed(1)}%`);
            conversionProgress.set(name, progress);
          }
        });
      });

      if (!result || !result.success) {
        throw new Error(result?.error || 'Conversion failed');
      }

      // Read converted file
      const convertedBuffer = await fs.readFile(tmpOutputFile.name);
      
      // Get proper MIME type
      const mimeType = mime.lookup(tmpOutputFile.name) || 'application/octet-stream';
      
      // Generate filename
      const baseName = path.parse(name).name;
      const outputFileName = `${baseName}.${format}`;

      // Set response headers and return file
      c.header('Content-Type', mimeType);
      c.header('Content-Disposition', `attachment; filename="${outputFileName}"`);
      c.header('Content-Length', convertedBuffer.length.toString());

      console.log(`Conversion completed successfully: ${name} -> ${outputFileName}`);
      
      // End performance monitoring
      performanceMonitor.endConversion(name, true);
      
      // Clean up progress tracking
      conversionProgress.delete(name);
      
      // Return the file as a Response
      return new Response(convertedBuffer, {
        headers: {
          'Content-Type': mimeType,
          'Content-Disposition': `attachment; filename="${outputFileName}"`,
          'Content-Length': convertedBuffer.length.toString(),
        },
      });

    } finally {
      // Clean up temporary files
      try {
        tmpInputFile.removeCallback();
        tmpOutputFile.removeCallback();
      } catch (cleanupError) {
        console.warn('Error cleaning up temporary files:', cleanupError);
      }
    }

  } catch (err) {
    console.error('Conversion error:', err);
    
    // End performance monitoring for failed conversion
    const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
    performanceMonitor.endConversion(fileName, false, errorMessage);
    
    // Clean up progress tracking
    conversionProgress.delete(fileName);
    
    return c.json({
      error: 'Conversion failed',
      details: errorMessage,
    }, 500);
  }
});

// Progress endpoint using polling instead of SSE
app.get('/progress/:fileName', async (c) => {
  const fileName = decodeURIComponent(c.req.param('fileName') || '');
  
  if (!fileName) {
    return c.json({ error: 'Missing fileName parameter' }, 400);
  }

  const progress = conversionProgress.get(fileName) || 0;
  const isActive = conversionProgress.has(fileName);
  
  console.log(`Progress check for ${fileName}: ${progress}% (active: ${isActive})`);
  
  return c.json({ 
    progress, 
    fileName, 
    isActive,
    timestamp: Date.now()
  });
});

// Health check endpoint
app.get('/health', (c) => {
  return c.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    ffmpeg: process.env.FFMPEG_PATH || 'ffmpeg',
    ffprobe: process.env.FFPROBE_PATH || 'ffprobe'
  });
});

// Get supported formats endpoint
app.get('/formats', (c) => {
  const formats = {
    image: ['jpeg', 'png', 'webp', 'gif', 'bmp', 'tiff', 'avif'],
    video: ['mp4', 'webm', 'avi', 'mov'],
    audio: ['mp3', 'wav', 'aac', 'ogg']
  };
  
  return c.json(formats);
});

// Performance report endpoint
app.get('/performance', (c) => {
  const report = performanceMonitor.getPerformanceReport();
  return c.text(report);
});

export const GET = handle(app);
export const POST = handle(app);
export const PATCH = handle(app);
export const DELETE = handle(app);
