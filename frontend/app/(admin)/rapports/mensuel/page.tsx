import { Suspense } from "react";
import MonthlyReportPageContent from "./page-content";

export default function MonthlyReportPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Chargement des données...</div>}>
      <MonthlyReportPageContent />
    </Suspense>
  );
}
