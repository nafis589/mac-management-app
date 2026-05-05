import { Suspense } from "react";
import DashboardClient from "./dashboard-client";

export const metadata = {
  title: "Tableau de Bord | Friperie de Luxe",
};

export default function AdminDashboardPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-2 md:pt-4">
      <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Chargement du tableau de bord...</div>}>
        <DashboardClient />
      </Suspense>
    </div>
  );
}
