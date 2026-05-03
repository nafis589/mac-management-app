import { Suspense } from "react";
import MonthlyReportClient from "./client-page";

export const metadata = {
  title: "Rapport Mensuel | Friperie de Luxe",
};

export default async function MonthlyReportPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>;
}) {
  const params = await searchParams;
  const currentDate = new Date();
  const month = params.month || (currentDate.getMonth() + 1).toString();
  const year = params.year || currentDate.getFullYear().toString();

  // Fetch report data
  const res = await fetch(`http://localhost:4000/api/reports/monthly?month=${month}&year=${year}`, {
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
        <MonthlyReportClient initialData={reportData} selectedMonth={month} selectedYear={year} />
      </Suspense>
    </div>
  );
}
