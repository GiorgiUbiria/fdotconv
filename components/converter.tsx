"use client";

import { Dropzone } from "./dropzone";
import { FileList } from "./file-list";
import { useState } from "react";

export function Converter() {
  const [files, setFiles] = useState<File[]>([]);

  return (
    <div>
      {files.length > 0 ? (
        <FileList files={files} setFiles={setFiles} />
      ) : (
        <Dropzone onDrop={setFiles} />
      )}
    </div>
  );
}
