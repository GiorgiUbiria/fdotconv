import { Hono } from "hono";
import { handle } from "hono/vercel";
import { serveStatic } from "@hono/node-server/serve-static";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";
import { createWriteStream } from "fs";
import { PassThrough, Readable } from "stream";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import mime from "mime-types";
import { ReadableStream } from "stream/web";

const app = new Hono().basePath("/api");

app.use("/*", serveStatic({ root: "./public" }));

const convertFile = async (
  inputPath: string,
  outputPath: string,
  format: string,
  fileType: string
) => {
  const isAudio = fileType.startsWith("audio/");
  const isVideo = fileType.startsWith("video/");

  const ffmpegCommand = ffmpeg(inputPath);

  if (isVideo && format.startsWith("audio/")) {
    ffmpegCommand.noVideo();
  } else if (isAudio && format.startsWith("video/")) {
    throw new Error("Cannot convert audio to video");
  }

  if (isAudio) {
    switch (format) {
      case "mp3":
        ffmpegCommand.audioCodec("libmp3lame");
        break;
      case "wav":
        ffmpegCommand.audioCodec("pcm_s16le");
        break;
      case "ogg":
        ffmpegCommand.audioCodec("libvorbis");
        break;
      case "aac":
        ffmpegCommand.audioCodec("aac");
        break;
      default:
        throw new Error(`Unsupported audio format: ${format}`);
    }
  } else if (isVideo) {
    switch (format) {
      case "mp4":
        ffmpegCommand.videoCodec("libx264");
        break;
      case "webm":
        ffmpegCommand.videoCodec("libvpx-vp9");
        break;
      case "avi":
        ffmpegCommand.videoCodec("mpeg4");
        break;
      case "mov":
        ffmpegCommand.videoCodec("prores_ks");
        break;
      case "mp3":
        ffmpegCommand.noVideo().audioCodec("libmp3lame").output(outputPath.replace(/\.[^.]+$/, '.mp3'));
        break;
      case "wav":
        ffmpegCommand.noVideo().audioCodec("pcm_s16le").output(outputPath.replace(/\.[^.]+$/, '.wav'));
        break;
      case "aac":
        ffmpegCommand.noVideo().audioCodec("aac").output(outputPath.replace(/\.[^.]+$/, '.aac'));
        break;
      case "ogg":
        ffmpegCommand.noVideo().audioCodec("libvorbis").output(outputPath.replace(/\.[^.]+$/, '.ogg'));
        break;
      default:
        throw new Error(`Unsupported video format: ${format}`);
    }
  }

  ffmpegCommand
    .outputOptions("-preset fast")
    .outputOptions("-crf 22");

  return new Promise<void>((resolve, reject) => {
    ffmpegCommand
      .on("start", (commandLine) => {
        console.log("FFmpeg process started:", commandLine);
      })
      .on("progress", (progress) => {
        console.log(`Processing: ${progress.percent}% done`);
      })
      .on("end", () => {
        console.log("Conversion completed successfully");
        resolve();
      })
      .on("error", (err) => {
        console.error("FFmpeg error:", err);
        reject(err);
      })
      .run();
  });
};

app.post(
  "/convert",
  zValidator(
    "form",
    z.object({
      file: z.instanceof(File),
      format: z.string(),
    })
  ),
  async (c) => {
    console.log("Received conversion request");
    try {
      const { file, format } = await c.req.parseBody();
      if (!file || !(file instanceof File)) {
        console.error("No file uploaded");
        return c.json({ error: "No file uploaded" }, 400);
      }

      const { name, type: fileType } = file;
      if (typeof format !== "string") {
        return c.json({ error: "Invalid format" }, 400);
      }

      console.log(`Processing file: ${name} to format: ${format}`);
      const inputPath = path.join("uploads", name);
      const outputPath = path.join(
        "converted",
        `${path.parse(name).name}.${format}`
      );

      try {
        await fs.promises.mkdir("uploads", { recursive: true });
        await fs.promises.mkdir("converted", { recursive: true });
      } catch (err) {
        console.error("Error creating directories:", err);
        return c.json({ error: "Failed to create directories" }, 500);
      }

      const writeStream = createWriteStream(inputPath);
      const fileBuffer = await file.arrayBuffer();
      const readStream = Readable.from(Buffer.from(fileBuffer));
      readStream.pipe(writeStream);

      await new Promise((resolve, reject) => {
        writeStream.on("finish", resolve);
        writeStream.on("error", (err) => {
          console.error("Error writing file:", err);
          reject(err);
        });
      });

      console.log("File written successfully, starting conversion");

      try {
        await convertFile(inputPath, outputPath, format, fileType);
      } catch (err) {
        console.error("Conversion error:", err);
        return c.json(
          { error: "Conversion failed", details: (err as Error).message },
          500
        );
      } finally {
        await fs.promises.unlink(inputPath);
      }

      return c.json({ success: true, outputPath });
    } catch (err) {
      console.error("Unexpected error:", err);
      return c.json(
        {
          error: "An unexpected error occurred",
          details: (err as Error).message,
        },
        500
      );
    }
  }
);

app.get("/converted/:filename", async (c) => {
  const filename = c.req.param("filename");
  const filePath = path.join("converted", filename);

  try {
    await fs.promises.access(filePath);
  } catch (err) {
    return c.json({ error: "File not found" }, 404);
  }

  const stat = await fs.promises.stat(filePath);
  const fileSize = stat.size;

  const mimeType = mime.lookup(filePath) || "application/octet-stream";

  c.header("Content-Type", mimeType);
  c.header("Content-Length", fileSize.toString());
  c.header("Content-Disposition", `attachment; filename="${filename}"`);

  const fileStream = fs.createReadStream(filePath);
  return c.newResponse(fileStream as any);
});

export const GET = handle(app);
export const POST = handle(app);
export const PATCH = handle(app);
export const DELETE = handle(app);
