"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import DailyReportClient from "./client-page";

export default function DailyReportPageContent() {
  const searchParams = useSearchParams();
  const date = searchParams.get("date") || new Date().toISOString().split("T")[0];

  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReport = async () => {
      setLoading(true);
      try {
        const res = await fetch(`http://localhost:4000/api/reports/daily?date=${date}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setReportData(data.data);
          }
        }
      } catch (err) {
        console.error("Erreur chargement rapport journalier", err);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [date]);

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Chargement des données...</div>;
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-2 md:pt-4">
      <DailyReportClient initialData={reportData} selectedDate={date} />
    </div>
  );
}
