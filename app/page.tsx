import { Converter } from '@/components/converter';

export default function Home() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center">
      <h1 className="mb-16 animate-pulse bg-gradient-to-r from-primary to-secondary bg-clip-text text-center text-5xl font-extrabold text-primary text-transparent [animation-duration:4s]">
        Format Converter
      </h1>
      <Converter />
    </div>
  );
}
