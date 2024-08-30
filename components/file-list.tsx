"use client";

import { convertFile } from "@/lib/utils";
import { useConversionStore } from "@/lib/conversionStore";
import {
  FileIcon,
  ImageIcon,
  TrashIcon,
  CloverIcon,
  DownloadIcon,
  RefreshCwIcon,
  PlusIcon,
} from "lucide-react";
import { useCallback, useRef, useState, useEffect } from "react";
import { toast } from "sonner";

type FileListProps = {
  files: File[];
  setFiles: (files: File[]) => void;
};

const getConversionOptions = (fileType: string) => {
  if (fileType.startsWith("image/")) {
    return ["jpeg", "png", "webp", "avif"];
  } else if (fileType.startsWith("video/")) {
    return ["mp4", "webm", "avi", "mov", "mp3", "wav", "aac", "ogg"];
  } else if (fileType.startsWith("audio/")) {
    return ["mp3", "wav", "ogg", "aac"];
  }
  return [];
};

export function FileList({ files, setFiles }: FileListProps) {
  const {
    conversionStates,
    setConverting,
    setConverted,
    setFormat,
    deleteFile,
    setConversionFailed,
    incrementRetryCount,
    initializeFile,
    reset,
  } = useConversionStore();
  const [isConvertingAll, setIsConvertingAll] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const conversionPromises = useRef<{ [key: string]: Promise<string | null> }>(
    {}
  );

  useEffect(() => {
    files.forEach((file) => {
      if (!conversionStates[file.name]) {
        const conversionOptions = getConversionOptions(file.type);
        initializeFile(file.name, file.type, conversionOptions[0] || "");
      }
    });
  }, [files, conversionStates, initializeFile]);

  const handleDelete = (file: File) => {
    setFiles(files.filter((f) => f !== file));
    deleteFile(file.name);
    delete conversionPromises.current[file.name];
    toast.success(`File ${file.name} deleted successfully`);
  };

  const handleFormatChange = (file: File, format: string) => {
    setFormat(file.name, format);
    toast.info(`Format for ${file.name} changed to ${format.toUpperCase()}`);
  };

  const handleConvert = useCallback(
    async (file: File) => {
      const existingPromise = conversionPromises.current[file.name];
      if (existingPromise) {
        return existingPromise;
      }

      setConverting(file.name);
      toast.loading(`Converting ${file.name}...`);

      const format = conversionStates[file.name]?.selectedFormat || getConversionOptions(file.type)[0];
      const convertWithRetry = async (retryCount: number): Promise<string | null> => {
        try {
          const convertedFile = await convertFile(file, format);
          setConverted(file.name, convertedFile || null);
          toast.success(`${file.name} converted successfully`);
          return convertedFile || null;
        } catch (error) {
          console.error("Conversion failed:", error);
          if (retryCount < 2) {
            incrementRetryCount(file.name);
            toast.error(`Conversion failed for ${file.name}. Retrying...`);
            return convertWithRetry(retryCount + 1);
          } else {
            setConversionFailed(file.name);
            toast.error(`Conversion failed for ${file.name} after multiple attempts`);
            return null;
          }
        }
      };

      const conversionPromise = convertWithRetry(0)
        .finally(() => {
          delete conversionPromises.current[file.name];
        });

      conversionPromises.current[file.name] = conversionPromise;
      return conversionPromise;
    },
    [conversionStates, setConverting, setConverted, incrementRetryCount, setConversionFailed]
  );

  const handleConvertAll = useCallback(() => {
    setIsConvertingAll(true);
    toast.loading("Converting all files...");
    const allConversionPromises = files.map((file) => handleConvert(file));
    Promise.all(allConversionPromises)
      .then((results) => {
        console.log("All conversions completed");
        files.forEach((file, index) => {
          setConverted(file.name, results[index]);
        });
        toast.success("All files converted successfully");
      })
      .catch((error) => {
        console.error("Error during batch conversion:", error);
        toast.error("Error during batch conversion");
      })
      .finally(() => {
        setIsConvertingAll(false);
      });
  }, [files, handleConvert, setConverted]);

  const handleDeleteAll = () => {
    setFiles([]);
    reset();
    conversionPromises.current = {};
    toast.success("All files deleted");
  };

  const allConversionsComplete =
    files.length > 0 &&
    files.every((file) => conversionStates[file.name]?.convertedUrl);

  const someConversionsFailed =
    files.length > 0 &&
    files.some((file) => conversionStates[file.name]?.conversionFailed && conversionStates[file.name]?.retryCount >= 2);

  const handleDownloadAll = () => {
    files.forEach((file) => {
      const fileState = conversionStates[file.name];
      if (fileState?.convertedUrl) {
        downloadFile(fileState.convertedUrl, `${file.name.split(".")[0]}.${fileState.selectedFormat}`);
      }
    });
    toast.success("All converted files downloaded");
  };

  const downloadFile = (url: string, fileName: string) => {
    fetch(url)
      .then(response => response.blob())
      .then(blob => {
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
        toast.success(`${fileName} downloaded successfully`);
      })
      .catch(error => {
        console.error("Download failed:", error);
        toast.error(`Failed to download ${fileName}`);
      });
  };

  const handleAddFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files);
      const totalFiles = [...files, ...newFiles];
      if (totalFiles.length > 5) {
        toast.error("Maximum 5 files allowed", {
          description: "Please remove some files before adding more.",
        });
        return;
      }
      setFiles(totalFiles);
      toast.success(`${newFiles.length} file(s) added successfully`);
    }
  };

  return (
    <div className="w-full">
      <h1 className="text-2xl font-bold mb-4">File List</h1>
      <div className="flex flex-wrap justify-between mb-4 gap-2">
        {files.length < 5 && (
          <>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAddFiles}
              multiple
              accept="image/*,video/*,audio/*"
              className="hidden"
            />
            <button
              className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
              onClick={() => fileInputRef.current?.click()}
            >
              <PlusIcon className="w-4 h-4 inline mr-2" />
              Add Files
            </button>
          </>
        )}
        <button
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          onClick={handleConvertAll}
          disabled={isConvertingAll}
        >
          {isConvertingAll ? "Converting..." : "Convert All"}
        </button>
        <button
          className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
          onClick={handleDeleteAll}
        >
          Delete All
        </button>
        {allConversionsComplete && (
          <button
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
            onClick={handleDownloadAll}
          >
            Download All
          </button>
        )}
        {someConversionsFailed && !isConvertingAll && (
          <button
            className="bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded"
            onClick={handleConvertAll}
          >
            Retry Failed Conversions
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full table-auto">
          <thead>
            <tr className="bg-gray-200 dark:bg-gray-800">
              <th className="px-4 py-2 text-primary text-left">File</th>
              <th className="px-4 py-2 text-primary text-left">Size</th>
              <th className="px-4 py-2 text-primary text-left">Type</th>
              <th className="px-4 py-2 text-primary text-left">Format</th>
              <th className="px-4 py-2 text-primary text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {files.map((file) => {
              const fileState = conversionStates[file.name];
              if (!fileState) return null;

              return (
                <tr key={file.name} className="border-b">
                  <td className="px-4 py-2 flex items-center">
                    {file.type.startsWith("image/") ? (
                      <ImageIcon className="w-4 h-4 mr-2" />
                    ) : (
                      <FileIcon className="w-4 h-4 mr-2" />
                    )}
                    <span className="truncate max-w-xs">
                      {file.name.length > 15
                        ? file.name.slice(0, 20) + "..."
                        : file.name}
                    </span>
                  </td>
                  <td className="px-4 py-2">{Math.round(file.size / 1024)} KB</td>
                  <td className="px-4 py-2">{file.type.split("/")[1]}</td>
                  <td className="px-4 py-2">
                    <select
                      className="text-md"
                      value={fileState.selectedFormat}
                      onChange={(e) => handleFormatChange(file, e.target.value)}
                      disabled={fileState.isConverting}
                    >
                      {getConversionOptions(fileState.fileType).map((format) => (
                        <option key={format} value={format}>
                          {format.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex gap-x-2">
                      <TrashIcon
                        className="w-4 h-4 text-red-500 hover:cursor-pointer hover:text-red-600"
                        onClick={() => handleDelete(file)}
                      />
                      {fileState.isConverting ? (
                        <CloverIcon className="w-4 h-4 text-yellow-500 animate-spin" />
                      ) : fileState.convertedUrl ? (
                        <DownloadIcon
                          className="w-4 h-4 text-blue-500 hover:cursor-pointer hover:text-blue-600"
                          onClick={() => downloadFile(fileState.convertedUrl!, `${file.name.split(".")[0]}.${fileState.selectedFormat}`)}
                        />
                      ) : fileState.conversionFailed && fileState.retryCount >= 2 ? (
                        <RefreshCwIcon
                          className="w-4 h-4 text-red-500 hover:cursor-pointer hover:text-red-600"
                          onClick={() => handleConvert(file)}
                        />
                      ) : (
                        <CloverIcon
                          className="w-4 h-4 text-green-500 hover:cursor-pointer hover:text-green-600"
                          onClick={() => handleConvert(file)}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}