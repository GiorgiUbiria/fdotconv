"use client";

import { Dropzone } from "./dropzone";
import { FileList } from "./file-list";
import { useConversionStore } from "@/providers/conversion-store-provider";
import { getConversionOptions } from "@/lib/utils";

export function Converter() {
  const files = useConversionStore((state) =>
    Object.values(state.conversionStates).map((state) => state.file)
  );
  const initializeFile = useConversionStore((state) => state.initializeFile);

  const handleDrop = (newFiles: File[]) => {
    newFiles.forEach((file) => {
      const conversionOptions = getConversionOptions(file.type);
      initializeFile(file, conversionOptions[0] || "");
    });
  };

  return (
    <div className="w-full max-w-6xl px-4">
      {files.length > 0 ? (
        <FileList files={files} />
      ) : (
        <Dropzone onDrop={handleDrop} />
      )}
    </div>
  );
}
