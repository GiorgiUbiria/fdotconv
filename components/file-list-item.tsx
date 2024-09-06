import { useConversionStore } from '@/providers/conversion-store-provider';
import { getConversionOptions } from '@/lib/utils';
import {
  FileIcon,
  ImageIcon,
  TrashIcon,
  CloverIcon,
  DownloadIcon,
  RefreshCwIcon,
} from 'lucide-react';

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
    <tr className="border-b border-primary/10 transition-colors duration-200 hover:bg-secondary/5">
      <td className="px-4 py-3">
        <div className="flex w-full justify-end gap-x-3">
          <TrashIcon
            className="h-5 w-5 cursor-pointer text-destructive transition-colors duration-200 hover:text-destructive/80"
            onClick={() => onDelete(file)}
          />
          {fileState.isConverting ? (
            <CloverIcon className="h-5 w-5 animate-spin text-yellow-500" />
          ) : fileState.convertedUrl ? (
            <div className="flex items-center">
              {file.type.startsWith('video/') && downloadTimer > 0 ? (
                <>
                  <DownloadIcon
                    className="mr-2 h-5 w-5 cursor-pointer text-blue-500 transition-colors duration-200 hover:text-blue-600"
                    onClick={() =>
                      onDownload(
                        fileState.convertedUrl!,
                        `${file.name.split('.')[0]}.${fileState.selectedFormat}`
                      )
                    }
                  />
                  <span className="text-sm text-blue-500">
                    {downloadTimer}s
                  </span>
                </>
              ) : (
                <RefreshCwIcon
                  className="h-5 w-5 cursor-pointer text-green-500 transition-colors duration-200 hover:text-green-600"
                  onClick={() => {
                    resetConversionState(file.name);
                    onConvert(file);
                  }}
                />
              )}
            </div>
          ) : fileState.conversionFailed ? (
            <RefreshCwIcon
              className="h-5 w-5 cursor-pointer text-red-500 transition-colors duration-200 hover:text-red-600"
              onClick={() => {
                resetConversionState(file.name);
                onConvert(file);
              }}
            />
          ) : (
            <CloverIcon
              className="h-5 w-5 cursor-pointer text-green-500 transition-colors duration-200 hover:text-green-600"
              onClick={() => onConvert(file)}
            />
          )}
        </div>
      </td>
    </tr>
  );
}
