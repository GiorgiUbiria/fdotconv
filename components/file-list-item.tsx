import { useConversionStore } from "@/providers/conversion-store-provider";
import { getConversionOptions } from "@/lib/utils";
import {
  FileIcon,
  ImageIcon,
  TrashIcon,
  CloverIcon,
  DownloadIcon,
  RefreshCwIcon,
} from "lucide-react";

type FileListItemProps = {
  file: File;
  onDelete: (file: File) => void;
  onConvert: (file: File) => void;
  onDownload: (url: string, fileName: string) => void;
  downloadTimer: number;
};

export function FileListItem({
  file,
  onDelete,
  onConvert,
  onDownload,
  downloadTimer,
}: FileListItemProps) {
  const { conversionStates, setFormat, resetConversionState } =
    useConversionStore((state) => state);
  const fileState = conversionStates[file.name];

  if (!fileState) return null;

  const handleFormatChange = (format: string) => {
    setFormat(file.name, format);
  };

  return (
    <tr className="border-b border-primary/10 hover:bg-secondary/5 transition-colors duration-200">
      <td className="px-4 py-3">
        <div className="flex gap-x-3 w-full justify-end">
          <TrashIcon
            className="w-5 h-5 text-destructive hover:text-destructive/80 cursor-pointer transition-colors duration-200"
            onClick={() => onDelete(file)}
          />
          {fileState.isConverting ? (
            <CloverIcon className="w-5 h-5 text-yellow-500 animate-spin" />
          ) : fileState.convertedUrl ? (
            <div className="flex items-center">
              {file.type.startsWith("video/") && downloadTimer > 0 ? (
                <>
                  <DownloadIcon
                    className="w-5 h-5 text-blue-500 hover:text-blue-600 cursor-pointer transition-colors duration-200 mr-2"
                    onClick={() =>
                      onDownload(
                        fileState.convertedUrl!,
                        `${file.name.split(".")[0]}.${fileState.selectedFormat}`
                      )
                    }
                  />
                  <span className="text-sm text-blue-500">
                    {downloadTimer}s
                  </span>
                </>
              ) : (
                <RefreshCwIcon
                  className="w-5 h-5 text-green-500 hover:text-green-600 cursor-pointer transition-colors duration-200"
                  onClick={() => {
                    resetConversionState(file.name);
                    onConvert(file);
                  }}
                />
              )}
            </div>
          ) : fileState.conversionFailed ? (
            <RefreshCwIcon
              className="w-5 h-5 text-red-500 hover:text-red-600 cursor-pointer transition-colors duration-200"
              onClick={() => {
                resetConversionState(file.name);
                onConvert(file);
              }}
            />
          ) : (
            <CloverIcon
              className="w-5 h-5 text-green-500 hover:text-green-600 cursor-pointer transition-colors duration-200"
              onClick={() => onConvert(file)}
            />
          )}
        </div>
      </td>
    </tr>
  );
}
