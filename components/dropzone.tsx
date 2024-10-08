'use client';

import { useDropzone } from 'react-dropzone';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useConversionStore } from '@/providers/conversion-store-provider';
import { getConversionOptions } from '@/lib/utils';

type DropzoneProps = {
  onDrop: (files: File[]) => void;
  className?: string;
};

export function Dropzone({ onDrop, className }: DropzoneProps) {
  const initializeFile = useConversionStore((state) => state.initializeFile);

  const { getRootProps, getInputProps, isDragActive, fileRejections } =
    useDropzone({
      onDrop: (acceptedFiles) => {
        acceptedFiles.forEach((file) => {
          const conversionOptions = getConversionOptions(file.type);
          initializeFile(file, conversionOptions[0] || '');
        });
        onDrop(acceptedFiles);
        toast.success(`${acceptedFiles.length} file(s) uploaded successfully`);
      },
      maxFiles: 5,
      multiple: true,
      accept: {
        'video/*': [],
        'audio/*': [],
        'image/*': [],
      },
      onDropRejected: () => {
        toast.error(
          'File upload failed. Please check file types and number of files.'
        );
      },
    });

  return (
    <div
      {...getRootProps()}
      className={cn(
        'rounded-xl border-4 border-dashed p-8',
        'flex h-80 w-full flex-col items-center justify-center',
        'cursor-pointer text-center transition-all duration-300',
        isDragActive
          ? 'scale-105 border-primary bg-primary/10'
          : 'border-secondary/50 hover:border-primary/50 hover:bg-secondary/5',
        className
      )}
    >
      <input {...getInputProps()} />
      <div className="relative mb-4 h-24 w-24">
        <svg
          className="h-full w-full text-primary"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
      </div>
      {isDragActive ? (
        <p className="animate-bounce text-2xl font-bold text-primary">
          Drop it like it is hot!
        </p>
      ) : (
        <p className="text-xl font-semibold text-secondary-foreground">
          Drag and drop up to 5 video, audio, or image files here,
          <br />
          or click to select files
        </p>
      )}
      {fileRejections.length > 0 &&
        toast.error(
          'You can only upload a maximum of 5 files at a time. Only video, audio, and image files are accepted.'
        )}
    </div>
  );
}
