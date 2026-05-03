import { Suspense } from "react";
import DailyReportClient from "./client-page";

export const metadata = {
  title: "Rapport Journalier | Friperie de Luxe",
};

export default async function DailyReportPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;
  const date = params.date || new Date().toISOString().split("T")[0];

  // Fetch report data
  const res = await fetch(`http://localhost:4000/api/reports/daily?date=${date}`, {
    cache: "no-store",
  });
  
  let reportData = null;
  if (res.ok) {
    const data = await res.json();
    if (data.success) {
      reportData = data.data;
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-2 md:pt-4">
      <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Chargement des données...</div>}>
        <DailyReportClient initialData={reportData} selectedDate={date} />
      </Suspense>
    </div>
  );
}
