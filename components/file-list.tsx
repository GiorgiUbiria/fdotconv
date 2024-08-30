"use client";

import { convertFile } from "@/lib/utils";
import {
  FileIcon,
  ImageIcon,
  TrashIcon,
  CloverIcon,
  DownloadIcon,
  RefreshCwIcon,
} from "lucide-react";
import { useReducer, useCallback, useRef, useState } from "react";

type FileListProps = {
  files: File[];
  setFiles: (files: File[]) => void;
};

type ConversionState = {
  isConverting: boolean;
  selectedFormat: string;
  convertedUrl: string | null;
  conversionFailed: boolean;
  retryCount: number;
};

type ConversionStates = {
  [key: string]: ConversionState;
};

type Action =
  | { type: "SET_CONVERTING"; payload: { fileName: string } }
  | { type: "SET_CONVERTED"; payload: { fileName: string; url: string | null } }
  | { type: "SET_FORMAT"; payload: { fileName: string; format: string } }
  | { type: "DELETE_FILE"; payload: { fileName: string } }
  | { type: "SET_CONVERSION_FAILED"; payload: { fileName: string } }
  | { type: "INCREMENT_RETRY_COUNT"; payload: { fileName: string } }
  | { type: "RESET" };

const initialState: ConversionStates = {};

function conversionReducer(
  state: ConversionStates,
  action: Action
): ConversionStates {
  switch (action.type) {
    case "SET_CONVERTING":
      return {
        ...state,
        [action.payload.fileName]: {
          ...state[action.payload.fileName],
          isConverting: true,
          conversionFailed: false,
        },
      };
    case "SET_CONVERTED":
      return {
        ...state,
        [action.payload.fileName]: {
          ...state[action.payload.fileName],
          isConverting: false,
          convertedUrl: action.payload.url,
          conversionFailed: action.payload.url === null,
          retryCount: 0,
        },
      };
    case "SET_FORMAT":
      return {
        ...state,
        [action.payload.fileName]: {
          ...state[action.payload.fileName],
          selectedFormat: action.payload.format,
        },
      };
    case "DELETE_FILE":
      const newState = { ...state };
      delete newState[action.payload.fileName];
      return newState;
    case "SET_CONVERSION_FAILED":
      return {
        ...state,
        [action.payload.fileName]: {
          ...state[action.payload.fileName],
          isConverting: false,
          conversionFailed: true,
        },
      };
    case "INCREMENT_RETRY_COUNT":
      return {
        ...state,
        [action.payload.fileName]: {
          ...state[action.payload.fileName],
          retryCount: (state[action.payload.fileName]?.retryCount || 0) + 1,
        },
      };
    case "RESET":
      return {};
    default:
      return state;
  }
}

export function FileList({ files, setFiles }: FileListProps) {
  const [conversionStates, dispatch] = useReducer(
    conversionReducer,
    initialState
  );
  const [isConvertingAll, setIsConvertingAll] = useState(false);

  const conversionPromises = useRef<{ [key: string]: Promise<string | null> }>(
    {}
  );

  const handleDelete = (file: File) => {
    setFiles(files.filter((f) => f !== file));
    dispatch({ type: "DELETE_FILE", payload: { fileName: file.name } });
    delete conversionPromises.current[file.name];
  };

  const handleFormatChange = (file: File, format: string) => {
    dispatch({ type: "SET_FORMAT", payload: { fileName: file.name, format } });
  };

  const handleConvert = useCallback(
    async (file: File) => {
      const existingPromise = conversionPromises.current[file.name];
      if (existingPromise) {
        return existingPromise;
      }

      dispatch({ type: "SET_CONVERTING", payload: { fileName: file.name } });

      const format = conversionStates[file.name]?.selectedFormat || "jpeg";
      const convertWithRetry = async (retryCount: number): Promise<string | null> => {
        try {
          const convertedFile = await convertFile(file, format);
          dispatch({
            type: "SET_CONVERTED",
            payload: { fileName: file.name, url: convertedFile || null },
          });
          return convertedFile || null;
        } catch (error) {
          console.error("Conversion failed:", error);
          if (retryCount < 2) {
            dispatch({ type: "INCREMENT_RETRY_COUNT", payload: { fileName: file.name } });
            return convertWithRetry(retryCount + 1);
          } else {
            dispatch({
              type: "SET_CONVERSION_FAILED",
              payload: { fileName: file.name },
            });
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
    [conversionStates]
  );

  const handleConvertAll = useCallback(() => {
    setIsConvertingAll(true);
    const allConversionPromises = files.map((file) => handleConvert(file));
    Promise.all(allConversionPromises)
      .then((results) => {
        console.log("All conversions completed");
        files.forEach((file, index) => {
          dispatch({
            type: "SET_CONVERTED",
            payload: { fileName: file.name, url: results[index] },
          });
        });
      })
      .catch((error) => {
        console.error("Error during batch conversion:", error);
      })
      .finally(() => {
        setIsConvertingAll(false);
      });
  }, [files, handleConvert]);

  const handleDeleteAll = () => {
    setFiles([]);
    dispatch({ type: "RESET" });
    conversionPromises.current = {};
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
  };

  const downloadFile = (url: string, fileName: string) => {
    fetch(url)
      .then(response => response.blob())
      .then(blob => {
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
      })
      .catch(error => console.error('Download failed:', error));
  };

  return (
    <div className="w-full">
      <h1 className="text-2xl font-bold mb-4">File List</h1>
      <div className="flex flex-wrap justify-between mb-4 gap-2">
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
              const fileState = conversionStates[file.name] || {
                isConverting: false,
                selectedFormat: "jpeg",
                convertedUrl: null,
                conversionFailed: false,
                retryCount: 0,
              };

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
                      <option value="jpeg">JPEG</option>
                      <option value="png">PNG</option>
                      <option value="webp">WEBP</option>
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
