import { Converter } from "@/components/converter";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)]">
      <h1 className="text-5xl font-extrabold mb-16 text-primary text-center bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent animate-pulse [animation-duration:4s]">
        Format Converter
      </h1>
      <Converter />
    </div>
  );
}
