"use client";

import { useDropzone } from "react-dropzone";
import { cn } from "@/lib/utils";

type DropzoneProps = {
  onDrop: (files: File[]) => void;
  accept?: string[];
  multiple?: boolean;
  className?: string;
};

export function Dropzone({
  onDrop,
  accept,
  multiple,
  className,
}: DropzoneProps) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "border-2 border-dashed border-gray-300 rounded-md p-4",
        className
      )}
    >
      <input {...getInputProps()} />
      {isDragActive ? (
        <p>Drop the files here ...</p>
      ) : (
        <p>Drag 'n' drop some files here, or click to select files</p>
      )}
    </div>
  );
}
