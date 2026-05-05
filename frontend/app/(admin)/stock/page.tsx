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
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
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
