"use client";

import { useDropzone } from "react-dropzone";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type DropzoneProps = {
  onDrop: (files: File[]) => void;
  className?: string;
};

export function Dropzone({
  onDrop,
  className,
}: DropzoneProps) {
  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop: (acceptedFiles) => {
      onDrop(acceptedFiles);
      toast.success(`${acceptedFiles.length} file(s) uploaded successfully`);
    },
    maxFiles: 5,
    multiple: true,
    accept: {
      'video/*': [],
      'audio/*': [],
      'image/*': []
    },
    onDropRejected: () => {
      toast.error("File upload failed. Please check file types and number of files.");
    }
  });

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed border-gray-300 rounded-lg p-8",
          "w-full max-w-2xl h-64 flex flex-col items-center justify-center",
          "text-center cursor-pointer transition-colors duration-300",
          isDragActive ? "bg-blue-50 border-blue-300" : "hover:bg-gray-50",
          className
        )}
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <p className="text-xl font-semibold text-blue-600">Drop the files here...</p>
        ) : (
          <p className="text-xl font-semibold text-gray-600">
            Drag and drop up to 5 video, audio, or image files here, or click to select files
          </p>
        )}
        {fileRejections.length > 0 && (
          toast.error("You can only upload a maximum of 5 files at a time. Only video, audio, and image files are accepted.")
        )}
      </div>
    </div>
  );
}
