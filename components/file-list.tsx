'use client';

import { convertFile, convertVideoFile, downloadFile } from '@/lib/utils';
import { useConversionStore } from '@/providers/conversion-store-provider';
import {
  FileIcon,
  ImageIcon,
  TrashIcon,
  CloverIcon,
  DownloadIcon,
  RefreshCwIcon,
  PlusIcon,
} from 'lucide-react';
import { useCallback, useRef, useState, useEffect } from 'react';
import { getConversionOptions } from '@/lib/utils';
import { toast } from 'sonner';

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
        initializeFile(file, conversionOptions[0] || '');
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
        (conversionStates[file.name]?.selectedFormat ||
          getConversionOptions(file.type)[0]) ??
        '';

      conversionPromises.current[file.name] = (async (): Promise<
        string | null
      > => {
        try {
          let url: string;
          if (file.type.startsWith('image/')) {
            url = (await convertFile(file, format)) as string;
          } else {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('format', format);

            const response = await fetch('/api/convert', {
              method: 'POST',
              body: formData,
            });

            if (!response.ok) {
              throw new Error('Conversion failed');
            }

            const blob = await response.blob();
            url = URL.createObjectURL(blob);
          }

          setConverted(file.name, url);
          if (
            file.type.startsWith('video/') ||
            file.type.startsWith('audio/') ||
            file.type.startsWith('image/')
          ) {
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
          return url;
        } catch (error) {
          console.error(`Conversion failed for ${file.name}:`, error);
          setConversionFailed(file.name);
          return null;
        } finally {
          delete conversionPromises.current[file.name];
          toast.dismiss(`converting-${file.name}`);
          toast.success(`Conversion complete for ${file.name}`);
        }
      })();

      return conversionPromises.current[file.name];
    },
    [conversionStates, setConverting, setConverted, setConversionFailed]
  );

  const handleConvertAll = useCallback(() => {
    setIsConvertingAll(true);
    toast.loading('Converting all files...', { id: 'convertingAll' });
    const allConversionPromises = files.map((file) => {
      resetConversionState(file.name);
      return handleConvert(file);
    });
    Promise.all(allConversionPromises)
      .then((results) => {
        console.log('All conversions completed');
        files.forEach((file, index) => {
          if (results[index]) {
            setConverted(file.name, results[index]);
          }
        });
        toast.success('All files converted successfully');
      })
      .catch((error) => {
        console.error('Error during batch conversion:', error);
        toast.error('Error during batch conversion');
      })
      .finally(() => {
        setIsConvertingAll(false);
        toast.dismiss('convertingAll');
      });
  }, [files, handleConvert, setConverted, resetConversionState]);

  const handleDeleteAll = useCallback(() => {
    reset();
    conversionPromises.current = {};
    toast.success('All files deleted');
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
          `${file.name.split('.')[0]}.${fileState.selectedFormat}`
        );
      }
    });
    toast.success('All converted files downloaded');
  };

  const handleAddFiles = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (event.target.files) {
        const newFiles = Array.from(event.target.files);
        newFiles.forEach((newFile) => {
          const conversionOptions = getConversionOptions(newFile.type);
          initializeFile(newFile, conversionOptions[0] || '');
        });
        toast.success(`${newFiles.length} file(s) added successfully`);
      }
    },
    [initializeFile]
  );

  return (
    <div className="w-full">
      <h1 className="mb-6 bg-gradient-to-r from-primary to-secondary bg-clip-text text-3xl font-bold text-primary text-transparent">
        File List
      </h1>
      <div className="mb-6 flex flex-wrap justify-between gap-3">
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
              className="flex items-center rounded-lg bg-primary px-4 py-2 font-bold text-primary-foreground transition-colors duration-300 hover:bg-primary/80 dark:text-primary-foreground"
              onClick={() => fileInputRef.current?.click()}
            >
              <PlusIcon className="mr-2 inline h-5 w-5" />
              Add Files
            </button>
          </>
        )}
        <button
          className="flex items-center rounded-lg bg-secondary px-4 py-2 font-bold text-secondary-foreground transition-colors duration-300 hover:bg-secondary/80 dark:text-secondary-foreground"
          onClick={handleConvertAll}
          disabled={isConvertingAll}
        >
          {isConvertingAll ? (
            <>
              <CloverIcon className="mr-2 h-5 w-5 animate-spin" />
              Converting...
            </>
          ) : (
            <>
              <RefreshCwIcon className="mr-2 h-5 w-5" />
              Convert All
            </>
          )}
        </button>
        <button
          className="flex items-center rounded-lg bg-destructive px-4 py-2 font-bold text-white transition-colors duration-300 hover:bg-destructive/80"
          onClick={handleDeleteAll}
        >
          <TrashIcon className="mr-2 h-5 w-5" />
          Delete All
        </button>
        {allConversionsComplete && (
          <button
            className="flex items-center rounded-lg bg-green-500 px-4 py-2 font-bold text-white transition-colors duration-300 hover:bg-green-600"
            onClick={handleDownloadAll}
          >
            <DownloadIcon className="mr-2 h-5 w-5" />
            Download All
          </button>
        )}
        {someConversionsFailed && !isConvertingAll && (
          <button
            className="flex items-center rounded-lg bg-yellow-500 px-4 py-2 font-bold text-white transition-colors duration-300 hover:bg-yellow-600"
            onClick={handleConvertAll}
          >
            <RefreshCwIcon className="mr-2 h-5 w-5" />
            Retry Failed Conversions
          </button>
        )}
      </div>
      <div className="overflow-x-auto rounded-lg shadow-lg">
        <table className="w-full table-auto">
          <thead>
            <tr className="bg-primary/10 dark:bg-primary/20">
              <th className="px-4 py-3 text-left font-semibold text-primary">
                File
              </th>
              <th className="px-4 py-3 text-left font-semibold text-primary">
                Size
              </th>
              <th className="px-4 py-3 text-left font-semibold text-primary">
                Format
              </th>
              <th className="px-4 py-3 text-right font-semibold text-primary">
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
                  className="border-b border-primary/10 transition-colors duration-200 hover:bg-secondary/5"
                >
                  <td className="flex items-center px-4 py-3">
                    {file.type.startsWith('image/') ? (
                      <ImageIcon className="mr-2 h-5 w-5 text-primary" />
                    ) : (
                      <FileIcon className="mr-2 h-5 w-5 text-primary" />
                    )}
                    <span className="max-w-xs truncate">
                      {(() => {
                        const parts = file.name.split('.');
                        const ext = parts.length > 1 ? parts.pop() : '';
                        const name = parts.join('.');
                        if (name.length <= 18) {
                          return file.name;
                        } else {
                          return `${name.slice(0, 15)}...${
                            ext ? ` .${ext}` : ''
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
                        className="w-full cursor-pointer appearance-none rounded border border-primary/20 bg-gradient-to-r from-primary/10 to-secondary/10 px-2 py-1 text-sm transition-all duration-200 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                        value={fileState.selectedFormat}
                        onChange={(e) => {
                          console.log('file size', file.size);
                          console.log('onChange', e.target.value);
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
                          className="h-3 w-3 fill-current"
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                        >
                          <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                        </svg>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex w-full justify-end gap-x-3">
                      <TrashIcon
                        className="h-5 w-5 cursor-pointer text-destructive transition-colors duration-200 hover:text-destructive/80"
                        onClick={() => handleDelete(file)}
                      />
                      {fileState.isConverting ? (
                        <CloverIcon className="h-5 w-5 animate-spin text-yellow-500" />
                      ) : fileState.convertedUrl ? (
                        <div className="flex items-center">
                          {downloadTimers[file.name] > 0 ? (
                            <>
                              <DownloadIcon
                                className="mr-2 h-5 w-5 cursor-pointer text-blue-500 transition-colors duration-200 hover:text-blue-600"
                                onClick={() =>
                                  downloadFile(
                                    fileState.convertedUrl!,
                                    `${file.name.split('.')[0]}.${
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
                              className="h-5 w-5 cursor-pointer text-green-500 transition-colors duration-200 hover:text-green-600"
                              onClick={() => {
                                resetConversionState(file.name);
                                handleConvert(file);
                              }}
                            />
                          )}
                        </div>
                      ) : fileState.conversionFailed ? (
                        <RefreshCwIcon
                          className="h-5 w-5 cursor-pointer text-red-500 transition-colors duration-200 hover:text-red-600"
                          onClick={() => {
                            resetConversionState(file.name);
                            handleConvert(file);
                          }}
                        />
                      ) : (
                        <CloverIcon
                          className="h-5 w-5 cursor-pointer text-green-500 transition-colors duration-200 hover:text-green-600"
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
