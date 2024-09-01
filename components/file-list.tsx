"use client";

import { convertFile, convertVideoFile } from "@/lib/utils";
import { useConversionStore } from "@/providers/conversion-store-provider";
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
import { getConversionOptions } from "@/lib/utils";
import { toast } from "sonner";

type FileListProps = {
  files: File[];
};

export function FileList({ files }: FileListProps) {
  const {
    conversionStates,
    setConverting,
    setConverted,
    setFormat,
    deleteFile,
    setConversionFailed,
    initializeFile,
    reset,
    resetConversionState,
  } = useConversionStore((state) => state);
  const [isConvertingAll, setIsConvertingAll] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [downloadTimers, setDownloadTimers] = useState<{
    [key: string]: number;
  }>({});

  const conversionPromises = useRef<{ [key: string]: Promise<string | null> }>(
    {}
  );

  useEffect(() => {
    files.forEach((file) => {
      if (!conversionStates[file.name]) {
        const conversionOptions = getConversionOptions(file.type);
        initializeFile(file, conversionOptions[0] || "");
      } else if (!conversionStates[file.name].file) {
        initializeFile(file, conversionStates[file.name].selectedFormat);
      }
    });
  }, [files, conversionStates, initializeFile]);

  const handleDelete = useCallback(
    async (file: File) => {
      const result = await conversionPromises.current[file.name];
      if (result) {
        delete conversionPromises.current[result];
      }

      deleteFile(file.name);
      toast.dismiss(`converting-${file.name}`);
      toast.success(`${file.name} deleted successfully`);
    },
    [deleteFile]
  );

  const handleFormatChange = useCallback(
    (file: File, format: string) => {
      setFormat(file.name, format);
    },
    [setFormat]
  );

  const handleConvert = useCallback(
    async (file: File) => {
      const existingPromise = conversionPromises.current[file.name];
      if (existingPromise) {
        return existingPromise;
      }

      setConverting(file.name);
      toast.loading(`Converting ${file.name}...`, {
        id: `converting-${file.name}`,
      });

      const format =
        conversionStates[file.name]?.selectedFormat ||
        getConversionOptions(file.type)[0];

      const conversionPromise = file.type.startsWith("video/")
        ? convertVideoFile(file, format)
        : convertFile(file, format);

      conversionPromises.current[file.name] = conversionPromise
        .then((convertedFile) => {
          setConverted(file.name, convertedFile || null);
          if (file.type.startsWith("video/")) {
            setDownloadTimers((prev) => ({ ...prev, [file.name]: 10 }));
            const timer = setInterval(() => {
              setDownloadTimers((prev) => {
                const newTime = prev[file.name] - 1;
                if (newTime <= 0) {
                  clearInterval(timer);
                  return { ...prev, [file.name]: 0 };
                }
                return { ...prev, [file.name]: newTime };
              });
            }, 1000);
          }
          return convertedFile || null;
        })
        .catch((error) => {
          console.error(`Conversion failed for ${file.name}:`, error);
          setConversionFailed(file.name);
          return null;
        })
        .finally(() => {
          delete conversionPromises.current[file.name];
          toast.dismiss(`converting-${file.name}`);
          toast.success(`Conversion complete for ${file.name}`);
        });

      return conversionPromises.current[file.name];
    },
    [conversionStates, setConverting, setConverted, setConversionFailed]
  );

  const handleConvertAll = useCallback(() => {
    setIsConvertingAll(true);
    toast.loading("Converting all files...", { id: "convertingAll" });
    const allConversionPromises = files.map((file) => {
      resetConversionState(file.name);
      return handleConvert(file);
    });
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
        toast.dismiss("convertingAll");
      });
  }, [files, handleConvert, setConverted, resetConversionState]);

  const handleDeleteAll = useCallback(() => {
    reset();
    conversionPromises.current = {};
    toast.success("All files deleted");
  }, [reset]);

  const allConversionsComplete =
    files.length > 0 &&
    files.every((file) => conversionStates[file.name]?.convertedUrl);

  const someConversionsFailed =
    files.length > 0 &&
    files.some((file) => conversionStates[file.name]?.conversionFailed);

  const handleDownloadAll = () => {
    files.forEach((file) => {
      const fileState = conversionStates[file.name];
      if (fileState?.convertedUrl) {
        downloadFile(
          fileState.convertedUrl,
          `${file.name.split(".")[0]}.${fileState.selectedFormat}`
        );
      }
    });
    toast.success("All converted files downloaded");
  };

  const downloadFile = (url: string, fileName: string) => {
    fetch(url)
      .then((response) => response.blob())
      .then((blob) => {
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
      })
      .catch((error) => {
        console.error("Download failed:", error);
        toast.error(`Failed to download files`);
      });
  };

  const handleAddFiles = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (event.target.files) {
        const newFiles = Array.from(event.target.files);
        newFiles.forEach((newFile) => {
          const conversionOptions = getConversionOptions(newFile.type);
          initializeFile(newFile, conversionOptions[0] || "");
        });
        toast.success(`${newFiles.length} file(s) added successfully`);
      }
    },
    [initializeFile]
  );

  return (
    <div className="w-full">
      <h1 className="text-3xl font-bold mb-6 text-primary bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
        File List
      </h1>
      <div className="flex flex-wrap justify-between mb-6 gap-3">
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
              className="bg-primary hover:bg-primary/80 text-primary-foreground dark:text-primary-foreground font-bold py-2 px-4 rounded-lg transition-colors duration-300 flex items-center"
              onClick={() => fileInputRef.current?.click()}
            >
              <PlusIcon className="w-5 h-5 inline mr-2" />
              Add Files
            </button>
          </>
        )}
        <button
          className="bg-secondary hover:bg-secondary/80 text-secondary-foreground dark:text-secondary-foreground font-bold py-2 px-4 rounded-lg transition-colors duration-300 flex items-center"
          onClick={handleConvertAll}
          disabled={isConvertingAll}
        >
          {isConvertingAll ? (
            <>
              <CloverIcon className="w-5 h-5 mr-2 animate-spin" />
              Converting...
            </>
          ) : (
            <>
              <RefreshCwIcon className="w-5 h-5 mr-2" />
              Convert All
            </>
          )}
        </button>
        <button
          className="bg-destructive hover:bg-destructive/80 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-300 flex items-center"
          onClick={handleDeleteAll}
        >
          <TrashIcon className="w-5 h-5 mr-2" />
          Delete All
        </button>
        {allConversionsComplete && (
          <button
            className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-300 flex items-center"
            onClick={handleDownloadAll}
          >
            <DownloadIcon className="w-5 h-5 mr-2" />
            Download All
          </button>
        )}
        {someConversionsFailed && !isConvertingAll && (
          <button
            className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-300 flex items-center"
            onClick={handleConvertAll}
          >
            <RefreshCwIcon className="w-5 h-5 mr-2" />
            Retry Failed Conversions
          </button>
        )}
      </div>
      <div className="overflow-x-auto rounded-lg shadow-lg">
        <table className="w-full table-auto">
          <thead>
            <tr className="bg-primary/10 dark:bg-primary/20">
              <th className="px-4 py-3 text-primary text-left font-semibold">
                File
              </th>
              <th className="px-4 py-3 text-primary text-left font-semibold">
                Size
              </th>
              <th className="px-4 py-3 text-primary text-left font-semibold">
                Format
              </th>
              <th className="px-4 py-3 text-primary text-right font-semibold">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {files.map((file) => {
              const fileState = conversionStates[file.name];
              if (!fileState) return null;

              return (
                <tr
                  key={file.name}
                  className="border-b border-primary/10 hover:bg-secondary/5 transition-colors duration-200"
                >
                  <td className="px-4 py-3 flex items-center">
                    {file.type.startsWith("image/") ? (
                      <ImageIcon className="w-5 h-5 mr-2 text-primary" />
                    ) : (
                      <FileIcon className="w-5 h-5 mr-2 text-primary" />
                    )}
                    <span className="truncate max-w-xs">
                      {(() => {
                        const parts = file.name.split(".");
                        const ext = parts.length > 1 ? parts.pop() : "";
                        const name = parts.join(".");
                        if (name.length <= 18) {
                          return file.name;
                        } else {
                          return `${name.slice(0, 15)}...${
                            ext ? ` .${ext}` : ""
                          }`;
                        }
                      })()}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {file.size >= 1024 * 1024
                      ? `${(file.size / (1024 * 1024)).toFixed(2)} MB`
                      : `${Math.round(file.size / 1024)} KB`}
                  </td>
                  <td className="px-4 py-3">
                    <div className="relative inline-block w-full">
                      <select
                        className="appearance-none w-full px-2 py-1 text-sm bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 rounded focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-all duration-200 cursor-pointer"
                        value={fileState.selectedFormat}
                        onChange={(e) => {
                          console.log("file size", file.size);
                          console.log("onChange", e.target.value);
                          handleFormatChange(file, e.target.value);
                        }}
                        disabled={fileState.isConverting}
                      >
                        {getConversionOptions(fileState.fileType).map(
                          (format) => (
                            <option
                              key={format}
                              value={format}
                              className="bg-background"
                            >
                              {format.toUpperCase()}
                            </option>
                          )
                        )}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1 text-primary">
                        <svg
                          className="fill-current h-3 w-3"
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                        >
                          <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                        </svg>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-x-3 w-full justify-end">
                      <TrashIcon
                        className="w-5 h-5 text-destructive hover:text-destructive/80 cursor-pointer transition-colors duration-200"
                        onClick={() => handleDelete(file)}
                      />
                      {fileState.isConverting ? (
                        <CloverIcon className="w-5 h-5 text-yellow-500 animate-spin" />
                      ) : fileState.convertedUrl ? (
                        <div className="flex items-center">
                          {file.type.startsWith("video/") &&
                          downloadTimers[file.name] > 0 ? (
                            <>
                              <DownloadIcon
                                className="w-5 h-5 text-blue-500 hover:text-blue-600 cursor-pointer transition-colors duration-200 mr-2"
                                onClick={() =>
                                  downloadFile(
                                    fileState.convertedUrl!,
                                    `${file.name.split(".")[0]}.${
                                      fileState.selectedFormat
                                    }`
                                  )
                                }
                              />
                              <span className="text-sm text-blue-500">
                                {downloadTimers[file.name]}s
                              </span>
                            </>
                          ) : (
                            <RefreshCwIcon
                              className="w-5 h-5 text-green-500 hover:text-green-600 cursor-pointer transition-colors duration-200"
                              onClick={() => {
                                resetConversionState(file.name);
                                handleConvert(file);
                              }}
                            />
                          )}
                        </div>
                      ) : fileState.conversionFailed ? (
                        <RefreshCwIcon
                          className="w-5 h-5 text-red-500 hover:text-red-600 cursor-pointer transition-colors duration-200"
                          onClick={() => {
                            resetConversionState(file.name);
                            handleConvert(file);
                          }}
                        />
                      ) : (
                        <CloverIcon
                          className="w-5 h-5 text-green-500 hover:text-green-600 cursor-pointer transition-colors duration-200"
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
