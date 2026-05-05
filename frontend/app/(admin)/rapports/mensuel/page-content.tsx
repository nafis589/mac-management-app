"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import MonthlyReportClient from "./client-page";

export default function MonthlyReportPageContent() {
  const searchParams = useSearchParams();
  const currentDate = new Date();
  const month = searchParams.get("month") || (currentDate.getMonth() + 1).toString();
  const year = searchParams.get("year") || currentDate.getFullYear().toString();

  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReport = async () => {
      setLoading(true);
      try {
        const res = await fetch(`http://localhost:4000/api/reports/monthly?month=${month}&year=${year}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setReportData(data.data);
          }
        }
      } catch (err) {
        console.error("Erreur chargement rapport mensuel", err);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [month, year]);

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Chargement des données...</div>;
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-2 md:pt-4">
      <MonthlyReportClient initialData={reportData} selectedMonth={month} selectedYear={year} />
    </div>
  );
}
