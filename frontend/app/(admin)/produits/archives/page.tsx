"use client"

import * as React from "react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { useRouter } from "next/navigation"
import {
  type ColumnDef,
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  type PaginationState,
  useReactTable,
} from "@tanstack/react-table"
import {
  Archive,
  Package,
  TrendingDown,
  DollarSign,
  Search,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowLeft,
  CalendarDays,
  X,
} from "lucide-react"
import { Line, LineChart, Bar, BarChart, CartesianGrid, XAxis, YAxis, Area, AreaChart } from "recharts"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import Link from "next/link"
import { getDeletedProducts } from "@/lib/api"

// ─── Types ───────────────────────────────────────────────────────────────────
interface ArchivedProduct {
  id: number
  name: string
  reference: string
  photos: string | null
  sale_price: number
  purchase_price: number
  quantity: number
  category: string | null
  brand: string | null
  archived_at: string | null
  archived_by: number | null
  archived_by_first_name?: string | null
  archived_by_last_name?: string | null
}

interface DailyStat {
  date: string
  count: number
  lost_value: number
}

interface MonthlyStat {
  month: string
  count: number
  lost_value: number
}

interface GroupStat {
  category?: string
  brand?: string
  count: number
  lost_value: number
}

interface DeletedData {
  products: ArchivedProduct[]
  global_stats: {
    total_archived: number
    lost_quantity: number
    lost_stock_value: number
    lost_potential_revenue: number
  }
  daily_stats: DailyStat[]
  monthly_stats: MonthlyStat[]
  grouped_by_category: GroupStat[]
  grouped_by_brand: GroupStat[]
}

// API calls go through the IPC-aware api.ts module

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF", minimumFractionDigits: 0 })
    .format(val)
    .replace("XOF", "FCFA")

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function ArchivesPage() {
  const router = useRouter()
  const [data, setData] = React.useState<DeletedData | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isAuthorized, setIsAuthorized] = React.useState(false)

  // Auth check
  React.useEffect(() => {
    const userStr = localStorage.getItem("fc_user")
    if (userStr) {
      try {
        const user = JSON.parse(userStr)
        if (user.role?.toUpperCase() !== "ADMIN") {
          router.replace("/")
        } else {
          setIsAuthorized(true)
        }
      } catch {
        router.replace("/")
      }
    } else {
      router.replace("/")
    }
  }, [router])

  // Fetch data
  React.useEffect(() => {
    if (!isAuthorized) return
    const load = async () => {
      try {
        const result = await getDeletedProducts()
        setData(result)
      } catch (e: any) {
        toast.error(e.message || "Impossible de charger les archives")
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [isAuthorized])

  // Filters
  const [searchTerm, setSearchTerm] = React.useState("")
  const [categoryFilter, setCategoryFilter] = React.useState("all")
  const [dateFrom, setDateFrom] = React.useState<Date | undefined>(undefined)
  const [dateTo, setDateTo] = React.useState<Date | undefined>(undefined)

  const products = data?.products || []
  const stats = data?.global_stats || { total_archived: 0, lost_quantity: 0, lost_stock_value: 0, lost_potential_revenue: 0 }

  // Category options
  const categoryOptions = React.useMemo(() => {
    const cats = products.map((p) => p.category).filter(Boolean) as string[]
    return Array.from(new Set(cats)).sort()
  }, [products])

  // Filtered products
  const filteredProducts = React.useMemo(() => {
    let filtered = products
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (p) => p.name.toLowerCase().includes(term) || p.reference.toLowerCase().includes(term)
      )
    }
    if (categoryFilter !== "all") {
      filtered = filtered.filter((p) => p.category === categoryFilter)
    }
    if (dateFrom) {
      const from = format(dateFrom, "yyyy-MM-dd")
      filtered = filtered.filter((p) => p.archived_at && p.archived_at >= from)
    }
    if (dateTo) {
      const to = format(dateTo, "yyyy-MM-dd") + "T23:59:59"
      filtered = filtered.filter((p) => p.archived_at && p.archived_at <= to)
    }
    return filtered
  }, [products, searchTerm, categoryFilter, dateFrom, dateTo])

  // Table columns
  const columns = React.useMemo<ColumnDef<ArchivedProduct>[]>(
    () => [
      {
        accessorKey: "photos",
        header: "Photo",
        cell: ({ row }) => {
          let photoUrl: string | null = null
          if (row.original.photos) {
            try {
              const parsed = typeof row.original.photos === "string" ? JSON.parse(row.original.photos) : row.original.photos
              if (Array.isArray(parsed) && parsed.length > 0) {
                const first = parsed[0]
                if (typeof first === "string" && first.trim() !== "") {
                  photoUrl = first.startsWith("http") ? first : `http://localhost:4000${first}`
                }
              }
            } catch {
              const raw = String(row.original.photos).trim()
              if (raw !== "") photoUrl = raw.startsWith("http") ? raw : `http://localhost:4000${raw}`
            }
          }
          return (
            <div className="relative h-12 w-12 overflow-hidden rounded-md border bg-muted flex items-center justify-center">
              {photoUrl ? (
                <img src={photoUrl} alt={row.original.name} className="h-full w-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none" }} />
              ) : (
                <ImageIcon className="h-6 w-6 text-muted-foreground/50" />
              )}
            </div>
          )
        },
      },
      {
        accessorKey: "name",
        header: "Nom",
        cell: ({ row }) => <span className="font-medium text-sm">{row.original.name}</span>,
      },
      {
        accessorKey: "reference",
        header: "Référence",
        cell: ({ row }) => <span className="text-muted-foreground text-sm">{row.original.reference}</span>,
      },
      {
        accessorKey: "sale_price",
        header: "Prix vente",
        cell: ({ row }) => (
          <div className="font-medium tabular-nums text-sm">{Number(row.original.sale_price).toLocaleString("fr-FR")} FCFA</div>
        ),
      },
      {
        accessorKey: "quantity",
        header: "Stock perdu",
        cell: ({ row }) => (
          <Badge variant="outline" className="bg-red-500/15 text-red-700 border-transparent dark:text-red-400">
            <span className="mr-1 inline-block size-1.5 rounded-full bg-red-500" />
            {row.original.quantity}
          </Badge>
        ),
      },
      {
        id: "lost_value",
        header: "Valeur perdue",
        cell: ({ row }) => {
          const val = Number(row.original.purchase_price) * Number(row.original.quantity)
          return <span className="font-medium tabular-nums text-sm text-red-600">{val.toLocaleString("fr-FR")} FCFA</span>
        },
      },
      {
        accessorKey: "category",
        header: "Catégorie",
        cell: ({ row }) => <span className="text-sm">{row.original.category || "—"}</span>,
      },
      {
        id: "archived_at",
        header: "Date suppression",
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm">
            {row.original.archived_at ? format(new Date(row.original.archived_at), "dd/MM/yyyy HH:mm", { locale: fr }) : "—"}
          </span>
        ),
      },
      {
        accessorKey: "archived_by",
        header: "Auteur",
        cell: ({ row }) => {
          const { archived_by, archived_by_first_name, archived_by_last_name } = row.original;
          if (archived_by_first_name || archived_by_last_name) {
            const fullName = [archived_by_first_name, archived_by_last_name].filter(Boolean).join(" ");
            return <span className="text-sm font-medium">{fullName}</span>;
          }
          return <span className="text-sm text-muted-foreground">#{archived_by || "—"}</span>;
        },
      },
    ],
    []
  )

  // Table instance
  const [pagination, setPagination] = React.useState<PaginationState>({ pageIndex: 0, pageSize: 10 })

  const table = useReactTable({
    data: filteredProducts,
    columns,
    state: { pagination },
    getRowId: (row) => String(row.id),
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  // Chart configs
  const lineChartConfig = { count: { label: "Suppressions", color: "#dc4818" } }
  const barChartConfig = { lost_value: { label: "Valeur perdue", color: "#dc4818" } }

  const dailyChartData = (data?.daily_stats || []).map((d) => ({
    ...d,
    label: d.date ? format(new Date(d.date), "dd MMM", { locale: fr }) : "",
    lost_value: Number(d.lost_value) || 0,
    count: Number(d.count) || 0,
  })).reverse()

  const monthlyChartData = (data?.monthly_stats || []).map((d) => ({
    ...d,
    label: d.month || "",
    lost_value: Number(d.lost_value) || 0,
    count: Number(d.count) || 0,
  })).reverse()

  if (!isAuthorized) return null

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Produits Archivés</h1>
            <p className="text-muted-foreground text-sm">Historique des produits supprimés et analyse des pertes.</p>
          </div>
        </div>
      </div>

      {/* SECTION 1 — KPI Cards */}
      <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs xl:grid-cols-4 dark:*:data-[slot=card]:bg-card">
        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex size-7 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
                <Archive className="size-4" />
              </div>
            </CardTitle>
            <CardDescription>Total archivés</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            {isLoading ? <Skeleton className="h-9 w-20" /> : (
              <div className="flex flex-wrap items-center gap-2">
                <div className="font-medium text-3xl tabular-nums leading-none tracking-tight">{stats.total_archived}</div>
              </div>
            )}
            <p className="text-muted-foreground text-sm">Produits supprimés</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex size-7 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
                <Package className="size-4" />
              </div>
            </CardTitle>
            <CardDescription>Stock perdu</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            {isLoading ? <Skeleton className="h-9 w-20" /> : (
              <div className="flex flex-wrap items-center gap-2">
                <div className="font-medium text-3xl tabular-nums leading-none tracking-tight">{stats.lost_quantity}</div>
              </div>
            )}
            <p className="text-muted-foreground text-sm">Unités perdues au total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex size-7 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
                <TrendingDown className="size-4" />
              </div>
            </CardTitle>
            <CardDescription>Valeur achat perdue</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            {isLoading ? <Skeleton className="h-9 w-20" /> : (
              <div className="flex flex-wrap items-center gap-2">
                <div className="font-medium text-3xl tabular-nums leading-none tracking-tight">{formatCurrency(Number(stats.lost_stock_value))}</div>
              </div>
            )}
            <p className="text-muted-foreground text-sm">Coût d&apos;acquisition perdu</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex size-7 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
                <DollarSign className="size-4" />
              </div>
            </CardTitle>
            <CardDescription>CA potentiel perdu</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            {isLoading ? <Skeleton className="h-9 w-20" /> : (
              <div className="flex flex-wrap items-center gap-2">
                <div className="font-medium text-3xl tabular-nums leading-none tracking-tight">{formatCurrency(Number(stats.lost_potential_revenue))}</div>
              </div>
            )}
            <p className="text-muted-foreground text-sm">Revenus potentiels manqués</p>
          </CardContent>
        </Card>
      </div>

      {/* SECTION 2 — Charts */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* Line Chart - Suppressions par jour (7j) — Spending Overview style */}
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Suppressions par jour</CardTitle>
            <CardDescription>Nombre de produits supprimés sur les 7 derniers jours</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-64 w-full" /> : (
              <ChartContainer config={lineChartConfig} className="h-64 w-full">
                <AreaChart data={dailyChartData} margin={{ left: 0, right: 0, top: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="fillCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#dc4818" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#dc4818" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis hide allowDecimals={false} />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent hideIndicator />} />
                  <Area
                    dataKey="count"
                    type="monotone"
                    fill="url(#fillCount)"
                    stroke="#dc4818"
                    strokeWidth={2}
                    dot={{ fill: "#dc4818", r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </AreaChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Bar Chart - Valeur perdue par mois (12 mois) — Flux de revenus style */}
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Valeur perdue par mois</CardTitle>
            <CardDescription>Évolution des pertes mensuelles sur 12 mois</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-64 w-full" /> : (
              <ChartContainer config={barChartConfig} className="h-64 w-full">
                <BarChart data={monthlyChartData} margin={{ left: 0, right: 0, top: 0, bottom: 0 }} barSize={32}>
                  <defs>
                    <pattern id="archive-bar-pattern" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                      <rect width="6" height="6" fill="#dc4818" fillOpacity="0.15" />
                      <line x1="0" y1="0" x2="0" y2="6" stroke="#dc4818" strokeWidth="1.25" strokeOpacity="0.40" />
                    </pattern>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="0" />
                  <XAxis dataKey="label" tickLine={false} tickMargin={10} axisLine={false} />
                  <YAxis hide />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent hideIndicator formatter={(value: any) => formatCurrency(Number(value))} />} />
                  <Bar dataKey="lost_value" fill="url(#archive-bar-pattern)" radius={[8, 8, 0, 0]} stroke="#dc4818" strokeOpacity={0.5} strokeWidth={0.5} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* SECTION 3 — Table */}
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="leading-none">{filteredProducts.length} Produits archivés</CardTitle>
          <CardDescription>Liste complète des produits supprimés avec les détails de perte.</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 pb-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="h-9 w-44 md:w-64 pl-8"
                placeholder="Rechercher nom, réf..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {categoryOptions.length > 0 && (
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-9 w-40"><SelectValue placeholder="Catégorie" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes catégories</SelectItem>
                  {categoryOptions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            )}

            <div className="flex items-center gap-2 ml-auto">
              <span className="text-sm text-muted-foreground">Du</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="h-9 w-[160px] justify-start text-left font-normal">
                    <CalendarDays className="mr-2 size-4 text-muted-foreground" />
                    {dateFrom ? format(dateFrom, "dd MMM yyyy", { locale: fr }) : <span className="text-muted-foreground">Choisir...</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} locale={fr} />
                </PopoverContent>
              </Popover>
              <span className="text-sm text-muted-foreground">au</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="h-9 w-[160px] justify-start text-left font-normal">
                    <CalendarDays className="mr-2 size-4 text-muted-foreground" />
                    {dateTo ? format(dateTo, "dd MMM yyyy", { locale: fr }) : <span className="text-muted-foreground">Choisir...</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dateTo} onSelect={setDateTo} locale={fr} />
                </PopoverContent>
              </Popover>
              {(dateFrom || dateTo) && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => { setDateFrom(undefined); setDateTo(undefined) }}
                >
                  <X className="size-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Data table */}
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto rounded-lg border">
                <Table className="**:data-[slot='table-cell']:px-6 **:data-[slot='table-head']:px-6 **:data-[slot='table-cell']:py-4">
                  <TableHeader className="border-t **:data-[slot='table-head']:h-11 **:data-[slot='table-head']:font-medium **:data-[slot='table-head']:text-foreground **:data-[slot='table-head']:text-sm bg-muted/20">
                    {table.getHeaderGroups().map((hg) => (
                      <TableRow key={hg.id}>
                        {hg.headers.map((h) => (
                          <TableHead key={h.id}>{h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}</TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody className="**:data-[slot='table-row']:border-border/50 **:data-[slot='table-row']:hover:bg-muted/10">
                    {table.getRowModel().rows.length ? (
                      table.getRowModel().rows.map((row) => (
                        <TableRow key={row.id}>
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground">
                          Aucun produit archivé trouvé.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label className="text-muted-foreground text-sm">Lignes par page</Label>
                  <Select value={`${table.getState().pagination.pageSize}`} onValueChange={(v) => table.setPageSize(Number(v))}>
                    <SelectTrigger size="sm" className="w-20"><SelectValue /></SelectTrigger>
                    <SelectContent side="top">
                      <SelectGroup>
                        {[10, 20, 30, 50].map((s) => <SelectItem key={s} value={`${s}`}>{s}</SelectItem>)}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex w-fit items-center justify-center font-medium text-sm">
                  Page {table.getState().pagination.pageIndex + 1} sur {table.getPageCount()}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" className="hidden size-8 lg:flex" size="icon" onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()}>
                    <ChevronsLeft className="size-4" />
                  </Button>
                  <Button variant="outline" className="size-8" size="icon" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
                    <ChevronLeft className="size-4" />
                  </Button>
                  <Button variant="outline" className="size-8" size="icon" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
                    <ChevronRight className="size-4" />
                  </Button>
                  <Button variant="outline" className="hidden size-8 lg:flex" size="icon" onClick={() => table.setPageIndex(table.getPageCount() - 1)} disabled={!table.getCanNextPage()}>
                    <ChevronsRight className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
