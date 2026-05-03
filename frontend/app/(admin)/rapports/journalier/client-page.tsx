"use client";

import * as React from "react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { useRouter } from "next/navigation";
import {
  Download,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  Wallet,
  CalendarIcon,
  Loader2,
  Calendar as CalendarLucide,
  CreditCard,
  Banknote,
  Smartphone
} from "lucide-react";
import { Area, CartesianGrid, ComposedChart, XAxis, YAxis, Tooltip } from "recharts";
import { toast } from "sonner";

import { cn, formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardAction } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

export default function DailyReportClient({
  initialData,
  selectedDate
}: {
  initialData: any;
  selectedDate: string
}) {
  const router = useRouter();
  const [date, setDate] = React.useState<Date | undefined>(parseISO(selectedDate));
  const [isExporting, setIsExporting] = React.useState(false);

  const handleDateChange = (newDate: Date | undefined) => {
    if (newDate) {
      setDate(newDate);
      router.push(`?date=${format(newDate, "yyyy-MM-dd")}`);
    }
  };

  const exportPDF = async () => {
    if (!initialData) return;
    setIsExporting(true);
    try {
      const response = await fetch("http://localhost:4000/api/reports/export/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "daily",
          reportData: initialData
        })
      });

      if (!response.ok) throw new Error("Erreur d'export");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rapport-journalier-${selectedDate}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success("Rapport exporté avec succès");
    } catch (error) {
      toast.error("Impossible d'exporter le rapport");
    } finally {
      setIsExporting(false);
    }
  };

  if (!initialData) {
    return <div className="p-8 text-center text-muted-foreground">Aucune donnée trouvée ou erreur serveur.</div>;
  }

  const { nbSales, totalRevenue, profit, revenueByPayment, topItems, hourlySales } = initialData;
  const panierMoyen = nbSales > 0 ? totalRevenue / nbSales : 0;

  // Formatting utils
  const formatFCFA = (val: number) => {
    return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF", minimumFractionDigits: 0 })
      .format(val)
      .replace("XOF", "FCFA");
  };

  // 1. Prepare Hourly Data (PerformanceOverview style)
  // Fix for "données qui ne s'affichent pas": The backend might return hour as string or number. Let's cast properly.
  const hourlyData = Array.from({ length: 24 }).map((_, i) => {
    const found = hourlySales?.find((h: any) => Number(h.hour) === i);
    return {
      hourLabel: `${i.toString().padStart(2, '0')}:00`,
      revenue: found ? parseFloat(found.revenue) : 0,
    };
  });

  const chartConfig = {
    revenue: {
      label: "Chiffre d'affaires",
      color: "#dc481850",
    },
  } satisfies ChartConfig;

  // 2. Prepare Hourly Breakdown (Exact SpendingBreakdown style)
  const hourlyDataWithSales = (hourlySales || [])
    .map((h: any) => ({
      key: `hour-${h.hour}`,
      label: `${h.hour.toString().padStart(2, '0')}:00 - ${(Number(h.hour) + 1).toString().padStart(2, '0')}:00`,
      amount: parseFloat(h.revenue)
    }))
    .filter((h: any) => h.amount > 0)
    .sort((a: any, b: any) => b.amount - a.amount);

  const totalHourlyRevenue = hourlyDataWithSales.reduce((sum: number, item: any) => sum + item.amount, 0);

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Rapport Journalier</h2>
          <p className="text-muted-foreground">Vue détaillée de l'activité du {date ? format(date, "d MMMM yyyy", { locale: fr }) : "jour"}</p>
        </div>

        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-[240px] justify-start text-left font-normal",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "EEEE d MMMM yyyy", { locale: fr }) : <span>Choisir une date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={date}
                onSelect={handleDateChange}
                disabled={(date) => date > new Date()}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Button onClick={exportPDF} disabled={isExporting} variant="default">
            {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Exporter
          </Button>
        </div>
      </div>

      {/* KPI Cards (MetricCards style) */}
      <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs xl:grid-cols-4 dark:*:data-[slot=card]:bg-card">
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
              <div className="font-medium text-3xl tabular-nums leading-none tracking-tight">{nbSales}</div>
            </div>
            <p className="text-muted-foreground text-sm">Tickets encaissés</p>
          </CardContent>
        </Card>

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
            <p className="text-muted-foreground text-sm">Chiffre d'affaires brut</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex size-7 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
                <TrendingUp className="size-4" />
              </div>
            </CardTitle>
            <CardDescription>Bénéfice Estimé</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="font-medium text-3xl tabular-nums leading-none tracking-tight">
                {formatFCFA(profit)}
              </div>
            </div>
            <p className="text-muted-foreground text-sm">Marge brute calculée</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex size-7 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
                <Wallet className="size-4" />
              </div>
            </CardTitle>
            <CardDescription>Panier Moyen</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="font-medium text-3xl tabular-nums leading-none tracking-tight">
                {formatFCFA(panierMoyen)}
              </div>
            </div>
            <p className="text-muted-foreground text-sm">Dépense par client</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Chart (PerformanceOverview style) */}
      <Card className="@container/card shadow-none">
        <CardHeader>
          <CardTitle className="leading-none">Chiffre d'affaires par heure</CardTitle>
          <CardDescription>
            Répartition de l'activité sur la journée sélectionnée
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="aspect-auto h-80 w-full">
            <ComposedChart data={hourlyData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-revenue)" stopOpacity={0.36} />
                  <stop offset="95%" stopColor="var(--color-revenue)" stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeOpacity={0.5} />

              <XAxis
                dataKey="hourLabel"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={10}
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

              <Area
                dataKey="revenue"
                type="monotone"
                fill="url(#fillRevenue)"
                stroke="var(--color-revenue)"
                strokeWidth={2}
                dot={false}
                fillOpacity={1}
                activeDot={{ r: 6 }}
              />
            </ComposedChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Breakdown and Top Items */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Hourly Breakdown (Exact SpendingBreakdown style) */}
        <Card className="lg:col-span-1 shadow-none">
          <CardHeader>
            <CardTitle>Répartition par Heure</CardTitle>
            <CardDescription>Distribution du CA par tranche horaire.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <div className="font-medium text-2xl">{formatFCFA(totalHourlyRevenue)}</div>
              <div className="flex h-6 w-full overflow-hidden rounded-md">
                {hourlyDataWithSales.length > 0 ? hourlyDataWithSales.map((item: any, index: number) => {
                  const width = totalHourlyRevenue > 0 ? (item.amount / totalHourlyRevenue) * 100 : 0;
                  const alpha = Math.max(0.35, 1 - index * 0.08);

                  return (
                    <div
                      key={item.key}
                      className="h-full shrink-0 border-background border-l first:border-l-0"
                      style={{
                        width: `${width}%`,
                        background: `color-mix(in oklch, var(--primary) ${alpha * 100}%, transparent)`,
                      }}
                      title={`${item.label}: ${formatFCFA(item.amount)}`}
                    />
                  );
                }) : (
                  <div className="h-full w-full bg-muted" />
                )}
              </div>
            </div>

            <div className="space-y-2">
              {hourlyDataWithSales.length > 0 ? hourlyDataWithSales.map((item: any, index: number) => {
                const pct = totalHourlyRevenue > 0 ? Math.round((item.amount / totalHourlyRevenue) * 100) : 0;
                const alpha = Math.max(0.35, 1 - index * 0.08);

                return (
                  <div key={item.key} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="size-3 rounded-sm"
                        style={{
                          background: `color-mix(in oklch, var(--primary) ${alpha * 100}%, transparent)`,
                        }}
                      />
                      <span className="text-muted-foreground text-sm">{item.label}</span>
                    </div>

                    <span className="font-medium text-sm tabular-nums">{pct}%</span>
                  </div>
                );
              }) : (
                <div className="text-center text-sm text-muted-foreground py-4">Aucune vente enregistrée</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top 5 Articles (ActionRiskLedger style or Table) */}
        <Card className="lg:col-span-2 shadow-none">
          <CardHeader>
            <CardTitle>Top 5 Articles</CardTitle>
            <CardDescription>Les produits ayant généré le plus de ventes.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produit</TableHead>
                  <TableHead className="text-right">Quantité</TableHead>
                  <TableHead className="text-right">CA généré</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topItems && topItems.length > 0 ? (
                  topItems.slice(0, 5).map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        <div className="font-medium">{item.name}</div>
                        <div className="text-xs text-muted-foreground font-mono mt-1">{item.reference}</div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary">{item.quantity_sold}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatFCFA(parseFloat(item.total_revenue))}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center h-32 text-muted-foreground">
                      Aucune vente enregistrée aujourd'hui.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
