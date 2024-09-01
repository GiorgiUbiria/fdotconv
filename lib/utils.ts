import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL, fetchFile } from "@ffmpeg/util";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import pQueue from "p-queue";

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
  const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";

  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
  });

  return ffmpeg;
}

function getFileNameAndExtension(file: File): {
  extension: string;
  name: string;
} {
  const parts = file.name.split(".");
  const extension = parts.pop() || "";
  const name = parts.join(".");

  if (!extension) {
    throw new Error("File has no extension");
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
      
      let ffmpegCommand = ["-i", inputFileName];
      
      if (file.type.startsWith("video/")) {
        if (["mp3", "wav", "aac", "ogg"].includes(to)) {
          ffmpegCommand.push("-vn");
          switch (to) {
            case "mp3":
              ffmpegCommand.push("-acodec", "libmp3lame");
              break;
            case "wav":
              ffmpegCommand.push("-acodec", "pcm_s16le");
              break;
            case "aac":
              ffmpegCommand.push("-acodec", "aac");
              break;
            case "ogg":
              ffmpegCommand.push("-acodec", "libvorbis");
              break;
          }
        } else {
          ffmpegCommand.push("-c:v", "libx264", "-preset", "fast", "-crf", "22");
          ffmpegCommand.push("-c:a", "aac");
        }
      } else if (file.type.startsWith("audio/")) {
        switch (to) {
          case "mp3":
            ffmpegCommand.push("-acodec", "libmp3lame");
            break;
          case "wav":
            ffmpegCommand.push("-acodec", "pcm_s16le");
            break;
          case "aac":
            ffmpegCommand.push("-acodec", "aac");
            break;
          case "ogg":
            ffmpegCommand.push("-acodec", "libvorbis");
            break;
        }
      } else if (file.type.startsWith("image/")) {
        ffmpegCommand.push("-vf", "scale='min(1920,iw)':'-1'");
      }
      
      switch (to) {
        case "mp4":
          ffmpegCommand.push("-f", "mp4");
          break;
        case "mp3":
          ffmpegCommand.push("-f", "mp3");
          break;
        case "wav":
          ffmpegCommand.push("-f", "wav");
          break;
        case "webm":
          ffmpegCommand.push("-f", "webm");
          break;
        case "gif":
          ffmpegCommand.push("-f", "gif");
          break;
      }
      
      ffmpegCommand.push(outputFileName);

      console.log("FFmpeg command:", ffmpegCommand);

      await ffmpegClient.exec(ffmpegCommand);

      const convertedFile = await ffmpegClient.readFile(outputFileName);
      const mimeType = file.type.split("/")[0] === "image" ? `image/${to}` : `${file.type.split("/")[0]}/${to}`;
      const blob = new Blob([convertedFile], { type: mimeType });
      const url = URL.createObjectURL(blob);

      await ffmpegClient.deleteFile(inputFileName);
      await ffmpegClient.deleteFile(outputFileName);

      console.log(`Conversion completed: ${inputFileName} to ${outputFileName}`);

      return url;
    } catch (error) {
      console.error("Error during file conversion:", error);
      if (error instanceof Error) {
        throw new Error(`File conversion failed: ${error.message}`);
      } else {
        throw new Error("File conversion failed due to an unknown error");
      }
    }
  });
}

export const getConversionOptions = (fileType: string) => {
  if (fileType.startsWith("image/")) {
    return ["jpeg", "png", "webp", "avif"];
  } else if (fileType.startsWith("video/")) {
    return ["mp4", "webm", "avi", "mov", "mp3", "wav", "aac", "ogg"];
  } else if (fileType.startsWith("audio/")) {
    return ["mp3", "wav", "ogg", "aac"];
  }
  return [];
};