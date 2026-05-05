"use client";

import * as React from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Package,
  PlusCircle,
  BarChart3,
  Store,
  CreditCard
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardAction } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getDailyReport, getMonthlyReport, getSalesHistory, getProducts } from "@/lib/api";

export default function DashboardClient() {
  const router = useRouter();
  const currentDate = new Date();
  const todayDay = currentDate.getDate();

  const [dailyReport, setDailyReport] = React.useState<any>(null);
  const [monthlyReport, setMonthlyReport] = React.useState<any>(null);
  const [recentSales, setRecentSales] = React.useState<any[]>([]);
  const [lowStockProducts, setLowStockProducts] = React.useState<any[]>([]);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const today = new Date().toISOString().split("T")[0];
        const month = (currentDate.getMonth() + 1).toString();
        const year = currentDate.getFullYear().toString();

        const [dailyData, monthlyData, salesData, productsData] = await Promise.all([
          getDailyReport(today).catch(() => null),
          getMonthlyReport(Number(month), Number(year)).catch(() => null),
          getSalesHistory({ limit: 5, include_items: true }).catch(() => []),
          getProducts().catch(() => [])
        ]);

        setDailyReport(dailyData);
        setMonthlyReport(monthlyData);
        setRecentSales(salesData || []);
        
        const allProducts = productsData || [];
        setLowStockProducts(allProducts.filter((p: any) => p.quantity <= 5));
      } catch (err) {
        console.error("Erreur de chargement", err);
      }
    };
    fetchData();
  }, []);

  // Actualisation automatique toutes les 30 secondes
  React.useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
    }, 30000);
    return () => clearInterval(interval);
  }, [router]);

  // Local formatFCFA
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF", minimumFractionDigits: 0 })
      .format(val)
      .replace("XOF", "FCFA");
  };

  const formatShortCurrency = (val: number) => {
    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
    return val.toString();
  };

  // --- KPI CARDS DATA PREPARATION ---
  const caAujourdhui = dailyReport?.totalRevenue || 0;
  const nbVentes = dailyReport?.nbSales || 0;
  const panierMoyen = nbVentes > 0 ? caAujourdhui / nbVentes : 0;
  const alertesStock = lowStockProducts?.length || 0;

  // Find yesterday's data for comparison
  const dailySales = monthlyReport?.dailySalesGraph || [];
  const yesterdayData = dailySales.find((d: any) => d.day === todayDay - 1) || { revenue: 0, nb_sales: 0 };

  const caYesterday = parseFloat(yesterdayData.revenue) || 0;
  const caEvolution = caYesterday > 0 ? ((caAujourdhui - caYesterday) / caYesterday) * 100 : (caAujourdhui > 0 ? 100 : 0);

  const ventesYesterday = parseInt(yesterdayData.nb_sales) || 0;
  const ventesEvolution = ventesYesterday > 0 ? ((nbVentes - ventesYesterday) / ventesYesterday) * 100 : (nbVentes > 0 ? 100 : 0);

  const panierYesterday = ventesYesterday > 0 ? caYesterday / ventesYesterday : 0;
  const panierEvolution = panierYesterday > 0 ? ((panierMoyen - panierYesterday) / panierYesterday) * 100 : (panierMoyen > 0 ? 100 : 0);

  // For Alertes Stock, let's just do a static +0% or show total products
  const alertesEvolution = 0; // Hard to calculate without history, we'll mock or set 0

  // --- PIPELINE ACTIVITY (CA CHART) DATA PREPARATION ---
  // Using daily sales for the chart
  const pipelineChartData = dailySales
    .filter((d: any) => d.day <= todayDay)
    .map((d: any) => {
      const dDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), d.day);
      return {
        date: dDate.toISOString(),
        revenue: parseFloat(d.revenue) || 0,
        dayLabel: `Jour ${d.day}`
      };
    });

  const totalMonthlyRevenue = pipelineChartData.reduce((sum: number, item: any) => sum + item.revenue, 0);
  const previousMonthRev = monthlyReport?.previousMonthRevenue || 0;

  // Progress against previous month (handle division by zero)
  const revenueProgress = previousMonthRev > 0 ? Math.round((totalMonthlyRevenue / previousMonthRev) * 100) : (totalMonthlyRevenue > 0 ? 100 : 0);

  const pipelineChartConfig = {
    revenue: {
      label: "Chiffre d'Affaires",
      color: "#dc4818",
    },
  };

  const axisDayFormatter = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });

  return (
    <div className="@container/main flex flex-col gap-6">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Tableau de Bord</h2>
          <p className="text-muted-foreground text-sm">
            Bonjour, voici le résumé de votre activité du {format(currentDate, "EEEE d MMMM yyyy", { locale: fr })}.
          </p>
        </div>
      </div>

      {/* 2. Row 1 : KPIs du jour */}
      <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs xl:grid-cols-4 dark:*:data-[slot=card]:bg-card">
        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex size-7 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
                <CreditCard className="size-4" />
              </div>
            </CardTitle>
            <CardDescription>CA Aujourd'hui</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="font-medium text-3xl tabular-nums leading-none tracking-tight">{formatCurrency(caAujourdhui)}</div>
            </div>
            <p className="text-muted-foreground text-sm">Chiffre d'affaires généré</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex size-7 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
                <Package className="size-4" />
              </div>
            </CardTitle>
            <CardDescription>Nombre de Ventes</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="font-medium text-3xl tabular-nums leading-none tracking-tight">{nbVentes}</div>
            </div>
            <p className="text-muted-foreground text-sm">Tickets émis</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex size-7 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
                <TrendingUp className="size-4" />
              </div>
            </CardTitle>
            <CardDescription>Panier Moyen</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="font-medium text-3xl tabular-nums leading-none tracking-tight">{formatCurrency(panierMoyen)}</div>
            </div>
            <p className="text-muted-foreground text-sm">Dépense par client</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex size-7 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
                <AlertTriangle className="size-4" />
              </div>
            </CardTitle>
            <CardDescription>Alertes Stock</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="font-medium text-3xl tabular-nums leading-none tracking-tight">{alertesStock}</div>
            </div>
            <p className="text-muted-foreground text-sm">Articles critiques en stock</p>
          </CardContent>
        </Card>
      </div>

      {/* 3. Row 2 : Pipeline Activity Style CA Chart */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Card className="xl:col-span-12 shadow-none">
          <CardHeader>
            <CardTitle>Flux de Revenus</CardTitle>
            <CardAction>
              <Select defaultValue="ce-mois">
                <SelectTrigger size="sm" className="min-w-40">
                  <SelectValue placeholder="Période" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="cette-semaine">Cette semaine</SelectItem>
                    <SelectItem value="ce-mois">Ce mois-ci</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </CardAction>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
              <ChartContainer config={pipelineChartConfig} className="h-72 w-full lg:col-span-8">
                <BarChart data={pipelineChartData} margin={{ left: 0, right: 0, top: 0, bottom: 0 }} barSize={38}>
                  <defs>
                    <pattern
                      id="crm-qualified-pattern"
                      width="4"
                      height="4"
                      patternUnits="userSpaceOnUse"
                      patternTransform="rotate(45)"
                    >
                      <rect width="6" height="6" fill="var(--color-revenue)" fillOpacity="0.15" />
                      <line
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="6"
                        stroke="var(--color-revenue)"
                        strokeWidth="1.25"
                        strokeOpacity="0.40"
                      />
                    </pattern>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="0" />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                    tickFormatter={(value) => axisDayFormatter.format(new Date(String(value)))}
                  />
                  <YAxis hide />
                  <ChartTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent
                        hideIndicator
                        formatter={(value: any) => formatCurrency(Number(value))}
                      />
                    }
                  />
                  <Bar
                    dataKey="revenue"
                    fill="url(#crm-qualified-pattern)"
                    radius={[8, 8, 0, 0]}
                    stroke="var(--color-revenue)"
                    strokeOpacity={0.5}
                    strokeWidth={0.5}
                  />
                </BarChart>
              </ChartContainer>

              <div className="flex flex-col gap-5 rounded-lg p-4 lg:col-span-4">
                <div className="flex flex-col gap-1">
                  <div className="font-medium text-3xl xl:text-4xl tabular-nums leading-none truncate w-full" title={formatCurrency(totalMonthlyRevenue)}>
                    {formatCurrency(totalMonthlyRevenue)}
                  </div>
                  <p className="text-muted-foreground text-sm">Chiffre d'affaires total généré depuis le début du mois.</p>
                </div>

                <div className="flex flex-col gap-3 rounded-lg border border-border/60 p-3">
                  <div className="text-[11px] text-muted-foreground uppercase tracking-widest">
                    Comparatif Mensuel
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="font-medium text-2xl tabular-nums leading-none truncate w-full" title={formatCurrency(previousMonthRev)}>
                      {formatCurrency(previousMonthRev)}
                    </div>
                    <p className="text-muted-foreground text-sm">
                      {revenueProgress > 100 ? "L'activité a dépassé" : "De l'activité par rapport au"} mois précédent.
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 pt-0.5">
                    <Progress
                      value={revenueProgress > 100 ? 100 : revenueProgress}
                      className="h-2.5 bg-chart-2/12 *:data-[slot='progress-indicator']:bg-chart-2"
                    />
                    <div className="flex items-center justify-between text-xs">
                      <div className="font-medium tabular-nums text-primary">{revenueProgress}% atteint</div>
                      <div className="text-muted-foreground tabular-nums">Mois dernier</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 4. Row 3 : Dernières Ventes (Revenue Risk Ledger style) */}
      <Card className="min-w-0 shadow-none overflow-hidden">
        <CardHeader>
          <CardTitle>Dernières Ventes</CardTitle>
          <CardDescription>Analyse détaillée des transactions les plus récentes.</CardDescription>
          <CardAction>
            <Badge variant="outline" className="font-medium tabular-nums">
              {recentSales.length} Transactions
            </Badge>
          </CardAction>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="min-w-0 overflow-hidden rounded-lg border">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="text-sm">Transaction</TableHead>
                  <TableHead className="text-sm">Articles</TableHead>
                  <TableHead className="text-sm">Vendeur</TableHead>
                  <TableHead className="text-right text-sm">Montant</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentSales.length > 0 ? (
                  recentSales.map((s: any) => {
                    let itemsStr = "Aucun article";
                    if (s.items && s.items.length > 0) {
                      itemsStr = s.items.map((i: any) => `${i.product_name}`).join(", ");
                    }

                    return (
                      <TableRow key={s.id}>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <p className="font-medium text-base">{s.reference}</p>
                            <p className="text-muted-foreground text-sm">
                              {format(new Date(s.created_at), "dd/MM/yyyy · HH:mm")}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-64 whitespace-normal text-sm">{itemsStr}</div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{s.cashier_name || "Admin"}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end">
                            <Badge
                              variant="outline"
                              className="min-w-16 text-sm py-1 justify-center font-medium tabular-nums border-primary/35 bg-primary/10 text-primary"
                            >
                              {formatCurrency(parseFloat(s.final_amount))}
                            </Badge>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">Aucune vente récente</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* 5. Liens rapides */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link href="/ventes">
          <Card className="hover:bg-muted/50 transition-colors shadow-none border-dashed border-2 cursor-pointer h-full">
            <CardContent className="flex flex-col items-center justify-center gap-2 p-6 text-center h-full">
              <Store className="size-8 text-primary mb-2" />
              <div className="font-medium text-lg">Nouvelle Vente</div>
              <p className="text-sm text-muted-foreground">Ouvrir la caisse</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/produits/nouveau">
          <Card className="hover:bg-muted/50 transition-colors shadow-none border-dashed border-2 cursor-pointer h-full">
            <CardContent className="flex flex-col items-center justify-center gap-2 p-6 text-center h-full">
              <PlusCircle className="size-8 text-primary mb-2" />
              <div className="font-medium text-lg">Ajouter Produit</div>
              <p className="text-sm text-muted-foreground">Nouveau vêtement</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/rapports/journalier">
          <Card className="hover:bg-muted/50 transition-colors shadow-none border-dashed border-2 cursor-pointer h-full">
            <CardContent className="flex flex-col items-center justify-center gap-2 p-6 text-center h-full">
              <BarChart3 className="size-8 text-primary mb-2" />
              <div className="font-medium text-lg">Rapports</div>
              <p className="text-sm text-muted-foreground">Analyser les ventes</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
