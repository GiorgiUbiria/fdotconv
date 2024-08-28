"use client";

import { useState } from "react";
import { convertFile } from "@/lib/utils";

export function FileUpload() {
  const [file, setFile] = useState<File[] | null>(null);
  const [fileType, setFileType] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [to, setTo] = useState<string[]>([]);
  const [convertedFile, setConvertedFile] = useState<string[] | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (selectedFiles) {
      setFile(Array.from(selectedFiles));
      setFileType(selectedFiles[0].type);
      setError(null);
    }
  };

  const handleConvert = async () => {
    if (file) {
      setIsConverting(true);
      setError(null);
      try {
        const results = await Promise.all(file.map((f, index) => convertFile(f, to[index])));
        setConvertedFile(results);
        console.log(results);
      } catch (error) {
        console.error("Conversion failed:", error);
        if (error instanceof Error && error.message.includes("FS")) {
          setError(
            "File system error occurred. Please try again or use a different browser."
          );
        } else {
          setError(
            `Conversion failed: ${
              error instanceof Error ? error.message : "Unknown error"
            }`
          );
        }
      } finally {
        setIsConverting(false);
      }
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="space-y-4 w-full max-w-md">
        <input
          multiple
          type="file"
          onChange={handleFileChange}
          accept="image/*, video/*"
          className="block w-full text-sm text-slate-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-full file:border-0
            file:text-sm file:font-semibold
            file:bg-violet-50 file:text-violet-700
            hover:file:bg-violet-100"
        />
        {file && Array.from(file).map((f, index) => (
          <div key={index} className="mt-4">
            <p className="mb-2">{f.name}</p>
            <select
              onChange={(e) => {
                const newTo = [...to];
                newTo[index] = e.target.value;
                setTo(newTo);
              }}
              className="w-full p-2 border rounded mb-2"
              value={to[index] || ""}
            >
              <option value="">Select format</option>
              {f.type.includes("image") ? (
                <>
                  <option value="gif">gif</option>
                  <option value="jpeg">jpeg</option>
                  <option value="avif">avif</option>
                  <option value="webp">webp</option>
                  <option value="png">png</option>
                  <option value="jpg">jpg</option>
                  <option value="bmp">bmp</option>
                  <option value="tiff">tiff</option>
                  <option value="heic">heic</option>
                  <option value="heif">heif</option>
                </>
              ) : (
                <>
                  <option value="mp4">mp4</option>
                  <option value="mov">mov</option>
                  <option value="avi">avi</option>
                  <option value="wmv">wmv</option>
                  <option value="flv">flv</option>
                  <option value="webm">webm</option>
                  <option value="mkv">mkv</option>
                  <option value="mp3">mp3</option>
                  <option value="wav">wav</option>
                </>
              )}
            </select>
          </div>
        ))}
        {file && file.length > 0 && (
          <button
            onClick={handleConvert}
            disabled={isConverting || to.some(t => t === "")}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-blue-300"
          >
            {isConverting ? "Converting..." : "Convert Files"}
          </button>
        )}
        {error && <div className="text-red-500 mt-2">{error}</div>}
        {convertedFile && (
          <div className="text-green-500 mt-2">
            {convertedFile.map((f, index) => (
              <a key={index} href={f} download className="underline">
                Download Converted File {index + 1}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
