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

      await ffmpegClient.writeFile(inputFileName, await fetchFile(file));
      await ffmpegClient.exec(["-i", inputFileName, outputFileName]);

      const convertedFile = await ffmpegClient.readFile(outputFileName);
      const blob = new Blob([convertedFile], { type: `image/${to}` });
      const url = URL.createObjectURL(blob);

      await ffmpegClient.deleteFile(inputFileName);
      await ffmpegClient.deleteFile(outputFileName);

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
