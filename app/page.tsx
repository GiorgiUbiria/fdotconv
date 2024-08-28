import { FileUpload } from "@/components/file-upload";

export default function Home() {
  return (
    <div className="container mx-auto p-4 flex flex-col items-center justify-center">
      <h1 className="text-3xl font-bold mb-4 text-primary text-center">
        Video to Audio Converter
      </h1>
      <FileUpload />
    </div>
  );
}
