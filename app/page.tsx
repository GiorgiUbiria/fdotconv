import { Converter } from "@/components/converter";

export default function Home() {
  return (
    <div className="container mx-auto p-4 flex flex-col items-center justify-center">
      <h1 className="text-3xl font-bold mb-4 text-primary text-center">
        Converter
      </h1>
      <Converter />
    </div>
  );
}
