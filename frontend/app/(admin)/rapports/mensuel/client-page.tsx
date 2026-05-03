"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Download,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Loader2,
  CalendarIcon
} from "lucide-react";
import { Area, CartesianGrid, ComposedChart, XAxis, YAxis, LineChart, Line } from "recharts";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Badge } from "@/components/ui/badge";

const MONTHS = [
  { value: "1", label: "Janvier" },
  { value: "2", label: "Février" },
  { value: "3", label: "Mars" },
  { value: "4", label: "Avril" },
  { value: "5", label: "Mai" },
  { value: "6", label: "Juin" },
  { value: "7", label: "Juillet" },
  { value: "8", label: "Août" },
  { value: "9", label: "Septembre" },
  { value: "10", label: "Octobre" },
  { value: "11", label: "Novembre" },
  { value: "12", label: "Décembre" },
];

export default function MonthlyReportClient({
  initialData,
  selectedMonth,
  selectedYear
}: {
  initialData: any;
  selectedMonth: string;
  selectedYear: string;
}) {
  const router = useRouter();
  const [isExporting, setIsExporting] = React.useState(false);

  const handleMonthChange = (val: string) => {
    router.push(`?month=${val}&year=${selectedYear}`);
  };

  const handleYearChange = (val: string) => {
    router.push(`?month=${selectedMonth}&year=${val}`);
  };

  const exportPDF = async () => {
    try {
      setIsExporting(true);
      const res = await fetch("http://localhost:4000/api/reports/export/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportData: initialData, type: "monthly" }),
      });

      if (!res.ok) throw new Error("Erreur lors de l'exportation");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rapport-mensuel-${selectedYear}-${selectedMonth.padStart(2, '0')}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success("Rapport exporté avec succès");
    } catch (error) {
      console.error(error);
      toast.error("Impossible d'exporter le rapport");
    } finally {
      setIsExporting(false);
    }
  };

  if (!initialData) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p>Chargement du rapport mensuel...</p>
        </div>
      </div>
    );
  }

  const {
    totalRevenue,
    previousMonthRevenue,
    evolutionPercentage,
    weeklyEvolution,
    dailySalesGraph,
    topProducts
  } = initialData;

  const totalSales = (dailySalesGraph || []).reduce((acc: number, d: any) => acc + (d.nb_sales || 0), 0);

  // Formatting utils
  const formatFCFA = (val: number) => {
    return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF", minimumFractionDigits: 0 })
      .format(val)
      .replace("XOF", "FCFA");
  };

  // LineChart for Weekly
  const weeklyData = (weeklyEvolution || []).map((w: any, idx: number) => ({
    weekLabel: `Semaine ${idx + 1}`,
    revenue: parseFloat(w.revenue)
  }));

  const chartConfigWeekly = {
    revenue: {
      label: "Chiffre d'Affaires",
      color: "var(--muted-foreground)",
    },
  } satisfies ChartConfig;

  // AreaChart for Daily
  const dailyData = (dailySalesGraph || []).map((d: any) => ({
    dayLabel: `Jour ${d.day}`,
    nbSales: parseInt(d.nb_sales),
    revenue: parseFloat(d.revenue)
  }));

  const chartConfigDaily = {
    nbSales: {
      label: "Ventes",
      color: "var(--foreground)",
    },
  } satisfies ChartConfig;

  const isPositiveEvolution = evolutionPercentage >= 0;

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Rapport Mensuel</h2>
          <p className="text-muted-foreground">Analyse globale de l'activité du mois</p>
        </div>

        <div className="flex items-center gap-2">
          <Select value={selectedMonth} onValueChange={handleMonthChange}>
            <SelectTrigger className="w-[140px]">
              <CalendarIcon className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Mois" />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedYear} onValueChange={handleYearChange}>
            <SelectTrigger className="w-[110px]">
              <SelectValue placeholder="Année" />
            </SelectTrigger>
            <SelectContent>
              {[0, 1, 2].map((i) => {
                const y = (new Date().getFullYear() - i).toString();
                return (
                  <SelectItem key={y} value={y}>
                    {y}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          <Button onClick={exportPDF} disabled={isExporting} variant="default">
            {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Exporter
          </Button>
        </div>
      </div>

      {/* KPI Cards (3 Cards) */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-none dark:*:data-[slot=card]:bg-card">
        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex size-7 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
                <DollarSign className="size-4" />
              </div>
            </CardTitle>
            <CardDescription>Chiffre d'Affaires</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="font-medium text-3xl tabular-nums leading-none tracking-tight">
                {formatFCFA(totalRevenue)}
              </div>
            </div>
            <p className="text-muted-foreground text-sm">CA total du mois sélectionné</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex size-7 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
                {isPositiveEvolution ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
              </div>
            </CardTitle>
            <CardDescription>Évolution vs Mois Précédent</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className={cn(
                "font-medium text-3xl tabular-nums leading-none tracking-tight",
                isPositiveEvolution ? "" : ""
              )}>
                {isPositiveEvolution ? "+" : ""}{evolutionPercentage.toFixed(1)}%
              </div>
            </div>
            <p className="text-muted-foreground text-sm">Par rapport au mois précédent ({formatFCFA(previousMonthRevenue)})</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex size-7 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
                <ShoppingCart className="size-4" />
              </div>
            </CardTitle>
            <CardDescription>Total Ventes</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="font-medium text-3xl tabular-nums leading-none tracking-tight">
                {totalSales}
              </div>
            </div>
            <p className="text-muted-foreground text-sm">Produits écoulés ce mois-ci</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Évolution CA Chart (LineChart with gold gradient) */}
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Évolution CA (Hebdomadaire)</CardTitle>
            <CardDescription>Croissance du chiffre d'affaires par semaine.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfigWeekly} className="aspect-auto h-[300px] w-full" style={{ "--color-revenue": "#fbbf24" } as React.CSSProperties}>
              <LineChart data={weeklyData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#f59e0b" />
                    <stop offset="50%" stopColor="#fbbf24" />
                    <stop offset="100%" stopColor="#fcd34d" />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeOpacity={0.5} />
                <XAxis
                  dataKey="weekLabel"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => {
                    if (value === 0) return "0";
                    return value >= 1000 ? `${(value / 1000).toFixed(0)}k` : `${value}`;
                  }}
                />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      className="w-48"
                      indicator="line"
                      formatter={(value: any) => formatFCFA(Number(value))}
                    />
                  }
                />
                <Line
                  dataKey="revenue"
                  type="monotone"
                  stroke="url(#lineGradient)"
                  strokeWidth={4}
                  dot={{ r: 4, fill: "#f59e0b", strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: "#fbbf24", strokeWidth: 0 }}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Ventes par jour (AreaChart) */}
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Ventes par jour</CardTitle>
            <CardDescription>Nombre de ventes effectuées chaque jour.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfigDaily} className="aspect-auto h-[300px] w-full" style={{ "--color-nbSales": "var(--primary)" } as React.CSSProperties}>
              <ComposedChart data={dailyData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="fillSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-nbSales)" stopOpacity={0.36} />
                    <stop offset="95%" stopColor="var(--color-nbSales)" stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeOpacity={0.5} />
                <XAxis
                  dataKey="dayLabel"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={20}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      className="w-32"
                      indicator="dot"
                    />
                  }
                />
                <Area
                  dataKey="nbSales"
                  type="monotone"
                  fill="url(#fillSales)"
                  stroke="var(--color-nbSales)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6 }}
                />
              </ComposedChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top 10 produits du mois */}
      <Card className="shadow-none mt-4">
        <CardHeader>
          <CardTitle>Top 10 produits du mois</CardTitle>
          <CardDescription>Les articles les plus populaires sur cette période.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Rang</TableHead>
                <TableHead>Produit</TableHead>
                <TableHead className="text-right">Quantité vendue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topProducts && topProducts.length > 0 ? (
                topProducts.map((item: any, index: number) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium text-muted-foreground">
                      #{index + 1}
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="font-medium">{item.name}</div>
                      <div className="text-xs text-muted-foreground font-mono mt-1">{item.reference}</div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary">{item.total_quantity}</Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center h-32 text-muted-foreground">
                    Aucune vente enregistrée pour ce mois.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
