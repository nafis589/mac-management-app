"use client";

import * as React from "react";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Package,
  PiggyBank,
  ShoppingBag,
  Plus,
  Loader2,
  ArrowUpRight,
  MoreHorizontal,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import {
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  type ColumnDef,
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  type PaginationState,
  useReactTable,
} from "@tanstack/react-table";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  getBudgetStats,
  getBudget,
  getDailyExpenses,
  getExpenses,
  getMonthlyReport,
  deleteExpense,
} from "@/lib/api";
import { SetBudgetModal } from "@/components/SetBudgetModal";
import { AddExpenseModal, type ExpenseEditData } from "@/components/AddExpenseModal";

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTHS = [
  { value: 1, label: "Janvier" },
  { value: 2, label: "Février" },
  { value: 3, label: "Mars" },
  { value: 4, label: "Avril" },
  { value: 5, label: "Mai" },
  { value: 6, label: "Juin" },
  { value: 7, label: "Juillet" },
  { value: 8, label: "Août" },
  { value: 9, label: "Septembre" },
  { value: 10, label: "Octobre" },
  { value: 11, label: "Novembre" },
  { value: 12, label: "Décembre" },
];

const CATEGORIES: Record<string, string> = {
  STOCK_PURCHASE: "Achat stock",
  EQUIPMENT: "Équipement",
  MAINTENANCE: "Maintenance",
  OTHER: "Autre",
};

const SOURCES: Record<string, string> = {
  BUDGET: "Budget",
  PERSONAL_FUNDS: "Fonds perso",
  LOAN: "Prêt",
  OTHER: "Autre",
};

const CATEGORY_COLORS: Record<string, string> = {
  STOCK_PURCHASE: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  EQUIPMENT: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  MAINTENANCE: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  OTHER: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

const dailyChartConfig = {
  cumul: {
    label: "Dépenses cumulées",
    color: "#dc4818",
  },
  budget: {
    label: "Budget prévu",
    color: "var(--foreground)",
  },
} satisfies ChartConfig;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatFCFA(n: number): string {
  return `${n.toLocaleString("fr-FR")} FCFA`;
}

function preventNav(e: React.MouseEvent<HTMLAnchorElement>) {
  e.preventDefault();
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BudgetPage() {
  const now = new Date();

  const [month, setMonth] = React.useState(now.getMonth() + 1);
  const [year, setYear] = React.useState(now.getFullYear());

  const [stats, setStats] = React.useState<any>(null);
  const [budget, setBudget] = React.useState<any>(null);
  const [monthlyReport, setMonthlyReport] = React.useState<any>(null);
  const [expenses, setExpenses] = React.useState<any[]>([]);
  const [dailyData, setDailyData] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  const [openSetBudget, setOpenSetBudget] = React.useState(false);
  const [openAddExpense, setOpenAddExpense] = React.useState(false);
  const [editExpense, setEditExpense] = React.useState<ExpenseEditData | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<{ id: number; description: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [globalFilter, setGlobalFilter] = React.useState("");

  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const currentYear = now.getFullYear();
  const years = Array.from({ length: 4 }, (_, i) => currentYear - 2 + i);

  // ── Fetch ───────────────────────────────────────────────────────────────

  const fetchAll = React.useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, budgetRes, expensesRes, reportRes, dailyRes] = await Promise.allSettled([
        getBudgetStats(month, year),
        getBudget(month, year),
        getExpenses({ month, year }),
        getMonthlyReport(month, year),
        getDailyExpenses(month, year),
      ]);

      if (statsRes.status === "fulfilled") setStats(statsRes.value);
      else setStats(null);

      if (budgetRes.status === "fulfilled") setBudget(budgetRes.value);
      else setBudget(null);

      if (expensesRes.status === "fulfilled") {
        const raw = expensesRes.value;
        setExpenses(Array.isArray(raw) ? raw : (raw?.data ?? []));
      } else {
        setExpenses([]);
      }

      if (reportRes.status === "fulfilled") setMonthlyReport(reportRes.value);
      else setMonthlyReport(null);

      if (dailyRes.status === "fulfilled") {
        setDailyData(Array.isArray(dailyRes.value) ? dailyRes.value : []);
      } else {
        setDailyData([]);
      }
    } catch {
      toast.error("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  React.useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Debounce recherche dépenses
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setGlobalFilter(searchTerm || "");
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // ── Valeurs KPI ─────────────────────────────────────────────────────────

  const planned = stats?.planned_amount ?? 0;
  const actual = stats?.actual_expenses ?? 0;
  const remaining = stats?.remaining ?? planned - actual;
  const stockPurchase = stats?.stock_purchase_total ?? 0;
  const profit = monthlyReport?.monthly_profit ?? 0;
  const newStockCost = monthlyReport?.new_stock_cost ?? 0;

  // ── Actions tableau ─────────────────────────────────────────────────────

  const handleEdit = (expense: any) => {
    setEditExpense({
      id: expense.id,
      date: expense.date,
      description: expense.description,
      amount: expense.amount,
      source: expense.source,
    });
    setOpenAddExpense(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const raw = localStorage.getItem("fc_user");
      const user = raw ? JSON.parse(raw) : {};
      await deleteExpense(deleteTarget.id, user.id);
      toast.success("Dépense supprimée");
      setDeleteTarget(null);
      fetchAll();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la suppression");
    } finally {
      setDeleteLoading(false);
    }
  };

  // ── Table ───────────────────────────────────────────────────────────────

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }) => {
        const d: string = row.original.date;
        if (!d) return "—";
        try {
          return new Date(d).toLocaleDateString("fr-FR");
        } catch {
          return d;
        }
      },
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => (
        <span
          className="block max-w-[220px] truncate"
          title={row.original.description}
        >
          {row.original.description}
        </span>
      ),
    },
    {
      accessorKey: "source",
      header: "Source",
      cell: ({ row }) => {
        const src: string = row.original.source ?? "BUDGET";
        return (
          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 max-w-[140px] truncate">
            {SOURCES[src] ?? src}
          </span>
        );
      },
    },
    {
      accessorKey: "amount",
      header: () => <span className="text-right w-full block">Montant</span>,
      cell: ({ row }) => (
        <span className="block text-right font-medium tabular-nums">
          {formatFCFA(row.original.amount ?? 0)}
        </span>
      ),
    },
    {
      id: "actions",
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Ouvrir le menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleEdit(row.original)}>
                Modifier
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() =>
                  setDeleteTarget({
                    id: row.original.id,
                    description: row.original.description,
                  })
                }
              >
                Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  const table = useReactTable({
    data: expenses,
    columns,
    state: { pagination, globalFilter },
    onPaginationChange: setPagination,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: "includesString",
  });

  const pageCount = table.getPageCount();
  const filteredCount = table.getFilteredRowModel().rows.length;
  const currentPage = pagination.pageIndex;

  const startIndex = filteredCount === 0 ? 0 : currentPage * pagination.pageSize + 1;
  const endIndex = Math.min(startIndex + pagination.pageSize - 1, filteredCount);

  const pageNumbers = React.useMemo(() => {
    if (pageCount <= 3) return Array.from({ length: pageCount }, (_, i) => i + 1);
    if (currentPage <= 1) return [1, 2, 3];
    if (currentPage >= pageCount - 2) return [pageCount - 2, pageCount - 1, pageCount];
    return [currentPage, currentPage + 1, currentPage + 2];
  }, [currentPage, pageCount]);

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── En-tête ────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Budget</h1>
          <p className="text-sm text-muted-foreground">
            Suivi du budget mensuel et des dépenses
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Sélecteur mois */}
          <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m) => (
                <SelectItem key={m.value} value={String(m.value)}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Sélecteur année */}
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-[90px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            onClick={() => setOpenSetBudget(true)}
            className="gap-2 bg-fp hover:bg-fp/90 text-white"
          >
            <Wallet className="size-4" />
            Définir budget
          </Button>
        </div>
      </div>

      {/* ── KPI Strip + Graphique (identique au composant KpiStrip de référence) ── */}
      {loading ? (
        <div className="flex h-[420px] items-center justify-center rounded-xl border bg-card">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="h-full overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
          <div className="grid grid-cols-1 xl:grid-cols-12">

            {/* ── Colonne gauche : 6 KPI cards (2×3) ── */}
            <TooltipProvider>
            <div className="grid grid-cols-1 md:grid-cols-2 md:grid-rows-3 xl:col-span-5 xl:border-r">

              {/* 1. Budget prévu */}
              <Card className="h-full rounded-none border-0 border-border border-b ring-0 md:border-r">
                <CardHeader>
                  <CardTitle className="font-normal text-sm">Budget prévu</CardTitle>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="text-2xl text-foreground tabular-nums leading-none tracking-tight truncate max-w-full">
                        {formatFCFA(planned)}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent><p>{formatFCFA(planned)}</p></TooltipContent>
                  </Tooltip>
                  <CardAction className="grid size-6 place-items-center rounded-sm bg-muted">
                    <Wallet className="size-3 text-foreground" />
                  </CardAction>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground truncate">
                    {planned === 0 ? "Aucun budget défini" : "Budget mensuel planifié"}
                  </div>
                </CardContent>
              </Card>

              {/* 2. Dépenses totales */}
              <Card className="h-full rounded-none border-0 border-border border-b ring-0">
                <CardHeader>
                  <CardTitle className="font-normal text-sm">Dépenses totales</CardTitle>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="text-2xl text-foreground tabular-nums leading-none tracking-tight truncate max-w-full">
                        {formatFCFA(actual)}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent><p>{formatFCFA(actual)}</p></TooltipContent>
                  </Tooltip>
                  <CardAction className="grid size-6 place-items-center rounded-sm bg-muted">
                    <ShoppingBag className="size-3 text-foreground" />
                  </CardAction>
                </CardHeader>
                <CardContent>
                  <div className="text-sm truncate">
                    {planned > 0 ? (
                      <>
                        <span className={actual <= planned ? "text-green-700 dark:text-green-300" : "text-destructive"}>
                          {((actual / planned) * 100).toFixed(1)} %
                        </span>
                        <span className="text-muted-foreground"> du budget</span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* 3. Reste disponible */}
              <Card className="h-full rounded-none border-0 border-border border-b ring-0 md:border-r">
                <CardHeader>
                  <CardTitle className="font-normal text-sm">Reste disponible</CardTitle>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className={cn(
                        "text-2xl tabular-nums leading-none tracking-tight truncate max-w-full",
                        remaining >= 0 ? "text-green-700 dark:text-green-300" : "text-destructive"
                      )}>
                        {formatFCFA(remaining)}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent><p>{formatFCFA(remaining)}</p></TooltipContent>
                  </Tooltip>
                  <CardAction className={cn("grid size-6 place-items-center rounded-sm", remaining >= 0 ? "bg-green-100 dark:bg-green-900/40" : "bg-red-100 dark:bg-red-900/40")}>
                    {remaining >= 0 ? (
                      <TrendingUp className="size-3 text-green-700 dark:text-green-300" />
                    ) : (
                      <TrendingDown className="size-3 text-destructive" />
                    )}
                  </CardAction>
                </CardHeader>
                <CardContent>
                  <div className={cn("text-sm font-medium truncate", remaining >= 0 ? "text-green-700 dark:text-green-300" : "text-destructive")}>
                    {remaining >= 0 ? "Budget sous contrôle" : "Dépassement budgétaire"}
                  </div>
                </CardContent>
              </Card>

              {/* 4. Dont Achat stock */}
              <Card className="h-full rounded-none border-0 border-border border-b ring-0">
                <CardHeader>
                  <CardTitle className="font-normal text-sm">Dont Achat stock</CardTitle>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="text-2xl text-foreground tabular-nums leading-none tracking-tight truncate max-w-full">
                        {formatFCFA(stockPurchase)}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent><p>{formatFCFA(stockPurchase)}</p></TooltipContent>
                  </Tooltip>
                  <CardAction className="grid size-6 place-items-center rounded-sm bg-muted">
                    <Package className="size-3 text-foreground" />
                  </CardAction>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground truncate">
                    {actual > 0 ? `${((stockPurchase / actual) * 100).toFixed(1)} % des dépenses` : "—"}
                  </div>
                </CardContent>
              </Card>

              {/* 5. Bénéfice du mois */}
              <Card className="h-full rounded-none border-0 border-border border-b ring-0 md:border-r md:border-b-0">
                <CardHeader>
                  <CardTitle className="font-normal text-sm">Bénéfice du mois</CardTitle>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className={cn(
                        "text-2xl tabular-nums leading-none tracking-tight truncate max-w-full",
                        profit >= 0 ? "text-foreground" : "text-destructive"
                      )}>
                        {formatFCFA(profit)}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent><p>{formatFCFA(profit)}</p></TooltipContent>
                  </Tooltip>
                  <CardAction className="grid size-6 place-items-center rounded-sm bg-muted">
                    <TrendingUp className="size-3 text-foreground" />
                  </CardAction>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground truncate">CA − prix d&apos;achat des produits vendus</div>
                </CardContent>
              </Card>

              {/* 6. Prix d'achat stock enregistré ce mois */}
              <Card className="h-full rounded-none border-0 ring-0">
                <CardHeader>
                  <CardTitle className="font-normal text-sm">Achat stock enregistré</CardTitle>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="text-2xl text-foreground tabular-nums leading-none tracking-tight truncate max-w-full">
                        {formatFCFA(newStockCost)}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent><p>{formatFCFA(newStockCost)}</p></TooltipContent>
                  </Tooltip>
                  <CardAction className="grid size-6 place-items-center rounded-sm bg-muted">
                    <PiggyBank className="size-3 text-foreground" />
                  </CardAction>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground truncate">Σ prix d&apos;achat — produits créés ce mois</div>
                </CardContent>
              </Card>
            </div>
            </TooltipProvider>

            {/* ── Colonne droite : dépenses cumulées vs budget ── */}
            <Card className="h-full rounded-none border-0 ring-0 xl:col-span-7">
              <CardHeader>
                <CardTitle className="font-normal">Dépenses cumulées vs Budget</CardTitle>
                <p className="text-xs text-muted-foreground -mt-1">
                  Cumul des dépenses jour par jour depuis le 1er du mois
                </p>
                <CardAction>
                  <ArrowUpRight className="size-4" />
                </CardAction>
              </CardHeader>
              <CardContent>
                {dailyData.length === 0 ? (
                  <div className="flex h-74 flex-col items-center justify-center gap-2 text-muted-foreground">
                    <ShoppingBag className="size-8 opacity-30" />
                    <p className="text-sm">Aucune donnée disponible ce mois</p>
                  </div>
                ) : (
                  <ChartContainer config={dailyChartConfig} className="h-74 w-full">
                    <ComposedChart
                      accessibilityLayer
                      data={dailyData}
                      margin={{ bottom: 0, left: 0, right: 0, top: 0 }}
                    >
                      <defs>
                        <filter id="budget-cumul-glow" x="-20%" y="-20%" width="140%" height="140%">
                          <feGaussianBlur stdDeviation="4" result="blur" />
                          <feFlood floodColor="var(--color-cumul)" floodOpacity="0.35" />
                          <feComposite in2="blur" operator="in" />
                          <feMerge>
                            <feMergeNode />
                            <feMergeNode in="SourceGraphic" />
                          </feMerge>
                        </filter>
                      </defs>

                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="day"
                        axisLine={false}
                        height={28}
                        interval="preserveStartEnd"
                        tick={{ fontSize: 10 }}
                        tickLine={false}
                        tickMargin={6}
                        tickFormatter={(day) =>
                          `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}`
                        }
                      />
                      <YAxis hide />

                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            className="w-56"
                            labelFormatter={(day) =>
                              `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`
                            }
                            formatter={(value, name, item) => (
                              <>
                                <div
                                  className="size-2.5 shrink-0 rounded-[2px]"
                                  style={{ backgroundColor: item.color }}
                                />
                                <div className="flex flex-1 items-center justify-between leading-none">
                                  <span className="text-muted-foreground">
                                    {String(name ?? "")}
                                  </span>
                                  <span className="font-medium font-mono text-foreground tabular-nums">
                                    {Number(value).toLocaleString("fr-FR")} FCFA
                                  </span>
                                </div>
                              </>
                            )}
                          />
                        }
                        cursor={{ stroke: "var(--border)", strokeDasharray: "4 4" }}
                      />

                      {/* Courbe dépenses cumulées (avec glow) */}
                      <Area
                        dataKey="cumul"
                        fill="var(--color-cumul)"
                        fillOpacity={0.12}
                        filter="url(#budget-cumul-glow)"
                        name="Dépenses cumulées"
                        stroke="var(--color-cumul)"
                        strokeWidth={1.8}
                        type="monotone"
                        activeDot={{
                          r: 4,
                          fill: "var(--background)",
                          stroke: "var(--color-cumul)",
                          strokeWidth: 2,
                        }}
                        dot={false}
                      />
                    </ComposedChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ── Tableau des dépenses ───────────────────────────────────────── */}
      <Card className="shadow-none">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="h-9 w-44 md:w-64 pl-8"
                placeholder="Rechercher une dépense..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  table.setPageIndex(0);
                }}
              />
            </div>
            <div className="ml-auto">
              <Button
                onClick={() => setOpenAddExpense(true)}
                className="gap-2 bg-fp hover:bg-fp/90 text-white"
              >
                <Plus className="size-4" />
                Ajouter dépense
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex flex-col gap-4 px-0">
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table className="**:data-[slot='table-cell']:px-6 **:data-[slot='table-head']:px-6 **:data-[slot='table-cell']:py-4">
                  <TableHeader className="border-t **:data-[slot='table-head']:h-11 **:data-[slot='table-head']:font-medium **:data-[slot='table-head']:text-foreground **:data-[slot='table-head']:text-sm bg-muted/20">
                    {table.getHeaderGroups().map((hg) => (
                      <TableRow key={hg.id}>
                        {hg.headers.map((header) => (
                          <TableHead key={header.id} colSpan={header.colSpan}>
                            {header.isPlaceholder
                              ? null
                              : flexRender(header.column.columnDef.header, header.getContext())}
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody className="**:data-[slot='table-row']:border-border/50 **:data-[slot='table-row']:hover:bg-muted/10">
                    {table.getRowModel().rows.length ? (
                      table.getRowModel().rows.map((row) => (
                        <TableRow key={row.id}>
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id}>
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={columns.length}
                          className="h-32 text-center text-muted-foreground"
                        >
                          <div className="flex flex-col items-center gap-2">
                            <ShoppingBag className="size-8 opacity-30" />
                            <p className="text-sm">Aucune dépense trouvée</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pied de tableau : compteur + pagination */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 pb-2 pt-2">
                <p className="text-muted-foreground text-sm">
                  {filteredCount > 0 ? (
                    <>Affichage {startIndex}–{endIndex} sur {filteredCount} dépense{filteredCount !== 1 ? "s" : ""}</>
                  ) : (
                    <>Aucune dépense visible</>
                  )}
                </p>

                {pageCount > 1 && (
                  <Pagination className="mx-0 w-auto justify-end">
                    <PaginationContent className="gap-1.5">
                      <PaginationItem>
                        <PaginationPrevious
                          href="#"
                          className={!table.getCanPreviousPage() ? "pointer-events-none opacity-50" : undefined}
                          onClick={(e) => { preventNav(e); table.previousPage(); }}
                        />
                      </PaginationItem>

                      {pageNumbers[0] > 1 && (
                        <PaginationItem>
                          <PaginationEllipsis />
                        </PaginationItem>
                      )}

                      {pageNumbers.map((pageNumber) => (
                        <PaginationItem key={`page-${pageNumber}`}>
                          <PaginationLink
                            href="#"
                            isActive={currentPage === pageNumber - 1}
                            onClick={(e) => { preventNav(e); table.setPageIndex(pageNumber - 1); }}
                          >
                            {pageNumber}
                          </PaginationLink>
                        </PaginationItem>
                      ))}

                      {pageNumbers[pageNumbers.length - 1] < pageCount && (
                        <PaginationItem>
                          <PaginationEllipsis />
                        </PaginationItem>
                      )}

                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          className={!table.getCanNextPage() ? "pointer-events-none opacity-50" : undefined}
                          onClick={(e) => { preventNav(e); table.nextPage(); }}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Modals ─────────────────────────────────────────────────────── */}
      <SetBudgetModal
        open={openSetBudget}
        onOpenChange={setOpenSetBudget}
        onSuccess={fetchAll}
        defaultMonth={month}
        defaultYear={year}
        budgetExists={!!budget}
      />
      <AddExpenseModal
        open={openAddExpense}
        onOpenChange={(v) => {
          setOpenAddExpense(v);
          if (!v) setEditExpense(null);
        }}
        onSuccess={fetchAll}
        budgetId={budget?.id ?? null}
        remaining={remaining}
        editExpense={editExpense}
      />

      {/* ── Modal suppression ──────────────────────────────────────────── */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la dépense</AlertDialogTitle>
            <AlertDialogDescription>
              Voulez-vous vraiment supprimer{" "}
              <span className="font-medium text-foreground">
                &ldquo;{deleteTarget?.description}&rdquo;
              </span>{" "}
              ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDelete}
              disabled={deleteLoading}
            >
              {deleteLoading ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : null}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
