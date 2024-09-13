import { Hono } from 'hono';
import { handle } from 'hono/vercel';
import { serveStatic } from '@hono/node-server/serve-static';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import tmp from 'tmp';
import path from 'path';
import { createWriteStream } from 'fs';
import { PassThrough, Readable } from 'stream';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import mime from 'mime-types';
import { ReadableStream } from 'stream/web';

const app = new Hono().basePath('/api');

app.use('/*', serveStatic({ root: './public' }));

const convertVideoToVideo = async (
  ffmpegCommand: ffmpeg.FfmpegCommand,
  format: string,
  outputPath: string
) => {
  switch (format) {
    case 'mp4':
      ffmpegCommand.videoCodec('libx264');
      break;
    case 'webm':
      ffmpegCommand.videoCodec('libvpx-vp9');
      break;
    case 'avi':
      ffmpegCommand.videoCodec('mpeg4');
      break;
    case 'mov':
      ffmpegCommand.videoCodec('prores_ks');
      break;
    default:
      throw new Error(`Unsupported video format: ${format}`);
  }
  ffmpegCommand.output(outputPath);
  return ffmpegCommand;
};

const convertVideoToAudio = (
  ffmpegCommand: ffmpeg.FfmpegCommand,
  format: string,
  outputPath: string
) => {
  console.log('Converting video to audio', format, outputPath);
  ffmpegCommand.noVideo();

  switch (format) {
    case 'mp3':
      ffmpegCommand.audioCodec('libmp3lame');
      break;
    case 'wav':
      ffmpegCommand.audioCodec('pcm_s16le');
      break;
    case 'aac':
      ffmpegCommand.audioCodec('aac');
      break;
    case 'ogg':
      ffmpegCommand.audioCodec('libvorbis');
      break;
    default:
      throw new Error(`Unsupported audio format: ${format}`);
  }

  ffmpegCommand
    .output(outputPath)
    .outputOptions('-y')
    .on('error', (err) => {
      console.error('Error:', err.message);
      throw err;
    });

  return ffmpegCommand;
};

const convertAudioToAudio = (
  ffmpegCommand: ffmpeg.FfmpegCommand,
  format: string,
  outputPath: string
) => {
  switch (format) {
    case 'mp3':
      ffmpegCommand.audioCodec('libmp3lame');
      break;
    case 'wav':
      ffmpegCommand.audioCodec('pcm_s16le');
      break;
    case 'ogg':
      ffmpegCommand.audioCodec('libvorbis');
      break;
    case 'aac':
      ffmpegCommand.audioCodec('aac');
      break;
    default:
      throw new Error(`Unsupported audio format: ${format}`);
  }
  ffmpegCommand
    .output(outputPath)
    .outputOptions('-y')
    .on('error', (err) => {
      console.error('Error:', err.message);
      throw err;
    });
  return ffmpegCommand;
};

const convertFile = async (
  inputPath: string,
  outputPath: string,
  format: string,
  fileType: string
) => {
  const isAudio = fileType.startsWith('audio/');
  const isVideo = fileType.startsWith('video/');

  const ffmpegCommand = ffmpeg(inputPath);

  if (isVideo) {
    if (['mp3', 'wav', 'aac', 'ogg'].includes(format)) {
      convertVideoToAudio(ffmpegCommand, format, outputPath);
    } else {
      convertVideoToVideo(ffmpegCommand, format, outputPath);
    }
  } else if (isAudio) {
    if (format.startsWith('video/')) {
      throw new Error('Cannot convert audio to video');
    }
    convertAudioToAudio(ffmpegCommand, format, outputPath);
  }

  ffmpegCommand.outputOptions('-preset fast').outputOptions('-crf 22');

  return new Promise<void>((resolve, reject) => {
    ffmpegCommand
      .on('start', (commandLine) => {
        console.log('FFmpeg process started:', commandLine);
      })
      .on('progress', (progress) => {
        console.log(`Processing: ${progress.percent}% done`);
      })
      .on('end', () => {
        console.log('Conversion completed successfully');
        resolve();
      })
      .on('error', (err) => {
        console.error('FFmpeg error:', err);
        reject(err);
      })
      .run();
  });
};

app.post(
  '/convert',
  zValidator(
    'form',
    z.object({
      file: z.instanceof(File),
      format: z.string(),
    })
  ),
  async (c) => {
    console.log('Received conversion request');
    try {
      const { file, format } = await c.req.parseBody();
      if (!file || !(file instanceof File)) {
        console.error('No file uploaded');
        return c.json({ error: 'No file uploaded' }, 400);
      }

      const { name, type: fileType } = file;
      if (typeof format !== 'string') {
        return c.json({ error: 'Invalid format' }, 400);
      }

      console.log(`Processing file: ${name} to format: ${format}`);

      // Create temporary files
      const tmpInputFile = tmp.fileSync({ postfix: path.extname(name) });
      const tmpOutputFile = tmp.fileSync({ postfix: `.${format}` });

      try {
        const fileBuffer = await file.arrayBuffer();
        const readStream = Readable.from(Buffer.from(fileBuffer));
        const writeStream = createWriteStream(tmpInputFile.name);

        await new Promise((resolve, reject) => {
          readStream.pipe(writeStream)
            .on('finish', resolve)
            .on('error', reject);
        });

        console.log('File written to temporary location, starting conversion');
        console.log(tmpInputFile.name, tmpOutputFile.name, format, fileType);

        await convertFile(tmpInputFile.name, tmpOutputFile.name, format, fileType);

        // Read the converted file
        const convertedBuffer = await fs.promises.readFile(tmpOutputFile.name);

        // Set appropriate headers for file download
        c.header('Content-Type', mime.lookup(tmpOutputFile.name) || 'application/octet-stream');
        c.header('Content-Disposition', `attachment; filename="${path.basename(tmpOutputFile.name)}"`);

        // Return the converted file as a response
        return c.body(convertedBuffer);
      } finally {
        // Clean up temporary files
        tmpInputFile.removeCallback();
        tmpOutputFile.removeCallback();
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      return c.json(
        {
          error: 'An unexpected error occurred',
          details: (err as Error).message,
        },
        500
      );
    }
  }
);

app.get('/converted/:filename', async (c) => {
  const filename = c.req.param('filename');
  const filePath = path.join('converted', filename);

  try {
    await fs.promises.access(filePath);
  } catch (err) {
    return c.json({ error: 'File not found' }, 404);
  }

  const stat = await fs.promises.stat(filePath);
  const fileSize = stat.size;

  const mimeType = mime.lookup(filePath) || 'application/octet-stream';

  c.header('Content-Type', mimeType);
  c.header('Content-Length', fileSize.toString());
  c.header('Content-Disposition', `attachment; filename="${filename}"`);

  const fileStream = fs.createReadStream(filePath);
  return c.newResponse(fileStream as any);
});

export const GET = handle(app);
export const POST = handle(app);
export const PATCH = handle(app);
export const DELETE = handle(app);
