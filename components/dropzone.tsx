'use client';

import { useDropzone } from 'react-dropzone';
import { cn, getMaxFileSize, isValidFileType, formatFileSize } from '@/lib/utils';
import { toast } from 'sonner';
import { useConversionStore } from '@/providers/conversion-store-provider';
import { getConversionOptions } from '@/lib/utils';

type DropzoneProps = {
  onDrop: (files: File[]) => void;
  className?: string;
};

export function Dropzone({ onDrop, className }: DropzoneProps) {
  const initializeFile = useConversionStore((state) => state.initializeFile);
  const maxFileSize = getMaxFileSize();

  const { getRootProps, getInputProps, isDragActive, fileRejections } =
    useDropzone({
      onDrop: (acceptedFiles) => {
        // Validate each file
        const validFiles: File[] = [];
        const errors: string[] = [];

        acceptedFiles.forEach((file) => {
          // Check file size
          if (file.size > maxFileSize) {
            errors.push(`${file.name}: File size (${formatFileSize(file.size)}) exceeds ${formatFileSize(maxFileSize)} limit`);
            return;
          }

          // Check file type
          if (!isValidFileType(file.type)) {
            errors.push(`${file.name}: Unsupported file type (${file.type})`);
            return;
          }

          validFiles.push(file);
        });

        // Show errors if any
        if (errors.length > 0) {
          errors.forEach(error => toast.error(error));
        }

        // Process valid files
        if (validFiles.length > 0) {
          validFiles.forEach((file) => {
            const conversionOptions = getConversionOptions(file.type);
            initializeFile(file, conversionOptions[0] || '');
          });
          onDrop(validFiles);
          toast.success(`${validFiles.length} file(s) uploaded successfully`);
        }
      },
      maxFiles: 5,
      multiple: true,
      maxSize: maxFileSize,
      accept: {
        'video/*': [],
        'audio/*': [],
        'image/*': [],
      },
      onDropRejected: (rejectedFiles) => {
        rejectedFiles.forEach((rejection) => {
          const { file, errors } = rejection;
          errors.forEach((error) => {
            if (error.code === 'file-too-large') {
              toast.error(`${file.name}: File size (${formatFileSize(file.size)}) exceeds ${formatFileSize(maxFileSize)} limit`);
            } else if (error.code === 'file-invalid-type') {
              toast.error(`${file.name}: Unsupported file type`);
            } else if (error.code === 'too-many-files') {
              toast.error('Too many files. Maximum 5 files allowed.');
            } else {
              toast.error(`${file.name}: ${error.message}`);
            }
          });
        });
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
        <div className="space-y-2">
          <p className="text-xl font-semibold text-secondary-foreground">
            Drag and drop up to 5 files here, or click to select
          </p>
          <p className="text-sm text-muted-foreground">
            Supports video, audio, and image files up to {formatFileSize(maxFileSize)}
          </p>
          <p className="text-xs text-muted-foreground">
            All conversions are processed securely on our servers
          </p>
        </div>
      )}
    </div>
  );
}
