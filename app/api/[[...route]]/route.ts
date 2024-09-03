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

      const { name } = file;
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
        fs.mkdirSync("uploads", { recursive: true });
        fs.mkdirSync("converted", { recursive: true });
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

      const isAudio = file.type.startsWith("audio/");
      const isVideo = file.type.startsWith("video/");
      const audioCodec = isAudio ? "-c:a aac" : "-c:a copy"; // Use AAC for audio conversion, or copy if not converting
      const videoCodec = isVideo ? "-c:v libx264" : ""; // Use H.264 for video conversion if applicable

      return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
          .outputOptions(videoCodec)
          .outputOptions(audioCodec)
          .outputOptions("-preset fast")
          .outputOptions("-crf 22")
          .output(outputPath)
          .on("start", (commandLine) => {
            console.log("FFmpeg process started:", commandLine);
          })
          .on("progress", (progress) => {
            console.log(`Processing: ${progress.percent}% done`);
          })
          .on("end", () => {
            console.log("Conversion completed successfully");
            fs.unlinkSync(inputPath);
            resolve(c.json({ success: true, outputPath }));

            setTimeout(() => {
              fs.unlink(outputPath, (err) => {
                if (err) {
                  console.error(`Error deleting file ${outputPath}:`, err);
                } else {
                  console.log(`File ${outputPath} deleted after 10 seconds`);
                }
              });
            }, 10000);
          })
          .on("error", (err) => {
            console.error("FFmpeg error:", err);
            reject(
              c.json({ error: "Conversion failed", details: err.message }, 500)
            );
          })
          .run();
      });
    } catch (err) {
      console.error("Unexpected error:", err);
      return c.json(
        { error: "An unexpected error occurred", details: err },
        500
      );
    }
  }
);

app.get("/converted/:filename", async (c) => {
  const filename = c.req.param("filename");
  const filePath = path.join("converted", filename);

  if (!fs.existsSync(filePath)) {
    return c.json({ error: "File not found" }, 404);
  }

  const stat = fs.statSync(filePath);
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
