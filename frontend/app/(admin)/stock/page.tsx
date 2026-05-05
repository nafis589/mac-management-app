"use client";

import { useEffect, useState } from "react";
import { StockClient } from "./stock-client";
import { Loader2 } from "lucide-react";

const API_BASE = "http://localhost:4000/api";

export default function StockPage() {
  const [dashboard, setDashboard] = useState({ totalProducts: 0, stockValue: 0, lowStockCount: 0 });
  const [alerts, setAlerts] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [dashRes, alertsRes, movementsRes] = await Promise.all([
          fetch(`${API_BASE}/stock/dashboard`),
          fetch(`${API_BASE}/stock/alerts`),
          fetch(`${API_BASE}/stock`),
        ]);

        const dashData = dashRes.ok ? await dashRes.json() : null;
        const alertsData = alertsRes.ok ? await alertsRes.json() : null;
        const movementsData = movementsRes.ok ? await movementsRes.json() : null;

        setDashboard(dashData?.data || { totalProducts: 0, stockValue: 0, lowStockCount: 0 });
        setAlerts(alertsData?.data || []);
        setMovements(movementsData?.data || []);
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
