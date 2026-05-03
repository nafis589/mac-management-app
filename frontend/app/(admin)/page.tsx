import { Suspense } from "react";
import DashboardClient from "./dashboard-client";

export const metadata = {
  title: "Tableau de Bord | Friperie de Luxe",
};

export default async function AdminDashboardPage() {
  const today = new Date().toISOString().split("T")[0];
  const currentDate = new Date();
  const month = (currentDate.getMonth() + 1).toString();
  const year = currentDate.getFullYear().toString();

  // Parallel fetch
  const [dailyRes, monthlyRes, salesRes, productsRes] = await Promise.all([
    fetch(`http://localhost:4000/api/reports/daily?date=${today}`, { cache: "no-store" }),
    fetch(`http://localhost:4000/api/reports/monthly?month=${month}&year=${year}`, { cache: "no-store" }),
    fetch(`http://localhost:4000/api/sales?limit=5&include_items=true`, { cache: "no-store" }),
    fetch(`http://localhost:4000/api/products`, { cache: "no-store" })
  ]);

  const dailyData = dailyRes.ok ? await dailyRes.json() : null;
  const monthlyData = monthlyRes.ok ? await monthlyRes.json() : null;
  const salesData = salesRes.ok ? await salesRes.json() : null;
  const productsData = productsRes.ok ? await productsRes.json() : null;

  const reportDaily = dailyData?.success ? dailyData.data : null;
  const reportMonthly = monthlyData?.success ? monthlyData.data : null;
  const recentSales = salesData?.success ? salesData.data : [];
  const allProducts = productsData?.success ? productsData.data : [];

  // Calculate low stock products (e.g., quantity <= 5)
  const lowStockProducts = allProducts.filter((p: any) => p.quantity <= 5);

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-2 md:pt-4">
      <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Chargement du tableau de bord...</div>}>
        <DashboardClient 
          dailyReport={reportDaily} 
          monthlyReport={reportMonthly} 
          recentSales={recentSales} 
          lowStockProducts={lowStockProducts} 
        />
      </Suspense>
    </div>
  );
}
