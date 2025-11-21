import ExcelExtractor from "@/components/excel-extract";

export const dynamic = "force-dynamic";

export default async function Home() {
  return (
    <div>
      <h1> Home Page </h1>
      <ExcelExtractor />
    </div>
  );
}
