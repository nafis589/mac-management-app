"use client";

import { useEffect, useState } from "react";
import { LivraisonsClient } from "./livraisons-client";

export default function LivraisonsPage() {
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        if ((window as any).electron) {
          const [deliveriesRes, customersRes] = await Promise.all([
            (window as any).electron.invoke("deliveries:getAll", { limit: 10000 }),
            (window as any).electron.invoke("customers:getAll"),
          ]);

          if (deliveriesRes?.success && deliveriesRes?.data?.deliveries) {
            setDeliveries(deliveriesRes.data.deliveries);
          } else {
            setDeliveries(deliveriesRes?.deliveries || []);
          }

          const customerList = customersRes?.data ?? customersRes ?? [];
          setCustomers(Array.isArray(customerList) ? customerList : []);
        }
      } catch (err) {
        console.error("Failed to fetch data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();

    (window as any).__refreshDeliveries = fetchAll;
    window.addEventListener("deliveries-updated", fetchAll);
    window.addEventListener("focus", fetchAll);
    return () => {
      delete (window as any).__refreshDeliveries;
      window.removeEventListener("deliveries-updated", fetchAll);
      window.removeEventListener("focus", fetchAll);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <LivraisonsClient initialDeliveries={deliveries} initialCustomers={customers} />;
}
