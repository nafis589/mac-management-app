import { Suspense } from "react";
import DailyReportPageContent from "./page-content";

export default function DailyReportPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Chargement des données...</div>}>
      <DailyReportPageContent />
    </Suspense>
  );
}
