"use client";

import { useEffect, useState } from "react";
import { LivraisonsClient } from "./livraisons-client";

export default function LivraisonsPage() {
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDeliveries = async () => {
      try {
        if ((window as any).electron) {
          const res = await (window as any).electron.invoke("deliveries:getAll", { limit: 10000 });
          if (res?.success && res?.data?.deliveries) {
            setDeliveries(res.data.deliveries);
          } else {
            setDeliveries(res?.deliveries || []); // Fallback
          }
        }
      } catch (err) {
        console.error("Failed to fetch deliveries:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDeliveries();

    // Attach to window to allow auto-refresh after actions
    (window as any).__refreshDeliveries = fetchDeliveries;
    
    return () => {
      delete (window as any).__refreshDeliveries;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <LivraisonsClient initialDeliveries={deliveries} />;
}
