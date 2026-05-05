"use client";

import { useEffect, useState } from "react";
import { StockClient } from "./stock-client";
import { Loader2 } from "lucide-react";

import { getStockDashboard, getLowStockAlerts, getStockMovements } from "@/lib/api";

export default function StockPage() {
  const [dashboard, setDashboard] = useState({ totalProducts: 0, stockValue: 0, lowStockCount: 0 });
  const [alerts, setAlerts] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [dashData, alertsData, movementsData] = await Promise.all([
          getStockDashboard().catch(() => null),
          getLowStockAlerts().catch(() => []),
          getStockMovements().catch(() => [])
        ]);

        setDashboard(dashData || { totalProducts: 0, stockValue: 0, lowStockCount: 0 });
        setAlerts(alertsData || []);
        setMovements(movementsData || []);
      } catch (err) {
        console.error("Erreur chargement stock", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  if (loading) {
    return (
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="h-8 w-48 bg-gray-200 animate-pulse rounded"></div>
            <div className="h-4 w-64 bg-gray-200 animate-pulse rounded mt-2"></div>
          </div>
          <div className="h-10 w-40 bg-gray-200 animate-pulse rounded"></div>
        </div>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 animate-pulse rounded-xl"></div>
          ))}
        </div>
        <div className="h-96 bg-gray-200 animate-pulse rounded-xl mt-4"></div>
      </div>
    );
  }

  return (
    <StockClient
      initialDashboard={dashboard}
      initialAlerts={alerts}
      initialMovements={movements}
    />
  );
}
