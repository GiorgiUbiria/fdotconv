import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL, fetchFile } from "@ffmpeg/util";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

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
  try {
    console.log(`Starting conversion of ${file.name} to ${to}`);
    const ffmpegClient = await loadFfmpeg();
    console.log("FFmpeg client loaded");
    const { name, extension } = getFileNameAndExtension(file);

    const inputFileName = `${name}.${extension}`;
    const outputFileName = `${name}.${to}`;
    console.log(`Input file: ${inputFileName}, Output file: ${outputFileName}`);

    console.log("Writing input file to FFmpeg");
    await ffmpegClient.writeFile(inputFileName, await fetchFile(file));
    console.log("Executing FFmpeg command");
    await ffmpegClient.exec([
      "-i",
      inputFileName,
      outputFileName,
    ]);
    console.log("FFmpeg command executed");

    console.log("Reading converted file");
    const convertedFile = await ffmpegClient.readFile(outputFileName);
    console.log("Creating Blob and URL");
    const blob = new Blob([convertedFile], { type: `image/${to}` });
    const url = URL.createObjectURL(blob);
    console.log(`Conversion completed. URL created: ${url}`);

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
}
