"use client"
import * as React from "react"
import { createPortal } from "react-dom"
import Image from "next/image"
import { format, isToday } from "date-fns"
import { fr } from "date-fns/locale"

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
  MoreHorizontal, Search, Truck, Clock, AlertTriangle, CheckCircle2,
  CalendarDays, X, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  ArrowLeft, ArrowRight,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { DeliveryDetailsView } from "@/components/DeliveryDetailsView"

export interface Delivery {
  id: number
  reference: string
  sale_id: number | null
  customer_name: string
  customer_phone: string
  delivery_address: string
  delivery_date: string
  delivery_time: string
  total_amount: number
  amount_paid: number
  payment_status: "UNPAID" | "PARTIAL" | "PAID"
  status: "PENDING" | "IN_PROGRESS" | "DELIVERED" | "CANCELLED"
  notes: string
  created_at: string
  delivered_at: string | null
  sale_reference?: string | null
  customer_id?: number | null
}

export interface Customer {
  id: number
  name: string
  phone: string
  address?: string
}

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF", minimumFractionDigits: 0 })
    .format(val).replace("XOF", "FCFA")

const PAYMENT_STATUS_MAP: Record<string, { label: string; classes: string }> = {
  UNPAID: { label: "Impayé", classes: "bg-red-100 text-red-800 hover:bg-red-200" },
  PARTIAL: { label: "Partiel", classes: "bg-orange-100 text-orange-800 hover:bg-orange-200" },
  PAID: { label: "Payé", classes: "bg-green-100 text-green-800 hover:bg-green-200" },
}

const DELIVERY_STATUS_MAP: Record<string, { label: string; classes: string }> = {
  PENDING: { label: "En attente", classes: "bg-red-100 text-red-800 hover:bg-red-200" },
  IN_PROGRESS: { label: "En cours", classes: "bg-orange-100 text-orange-800 hover:bg-orange-200" },
  DELIVERED: { label: "Livrée", classes: "bg-green-100 text-green-800 hover:bg-green-200" },
  CANCELLED: { label: "Annulée", classes: "bg-gray-100 text-gray-800 hover:bg-gray-200" },
}

/* ─────────────────────────────────────────────────────────────────────────────
   Composant principal
───────────────────────────────────────────────────────────────────────────── */
export function LivraisonsClient({
  initialDeliveries,
  initialCustomers,
}: {
  initialDeliveries: Delivery[]
  initialCustomers?: Customer[]
}) {
  // Vue active : "customers" | "client-space" | "delivery-detail"
  const [view, setView] = React.useState<"customers" | "client-space" | "delivery-detail">("customers")
  const [selectedCustomer, setSelectedCustomer] = React.useState<Customer | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [deliveryDetails, setDeliveryDetails] = React.useState<any | null>(null)

  // Search for customer grid
  const [customerSearch, setCustomerSearch] = React.useState("")

  // ── Stats globales ──────────────────────────────────────────────────
  const globalStats = React.useMemo(() => {
    let pending = 0, inProgress = 0, deliveredToday = 0, unpaid = 0
    initialDeliveries.forEach(d => {
      if (d.status === "PENDING") pending++
      if (d.status === "IN_PROGRESS") inProgress++
      if (d.status === "DELIVERED" && d.delivered_at && isToday(new Date(d.delivered_at))) deliveredToday++
      if (d.payment_status === "UNPAID") unpaid++
    })
    return { pending, inProgress, deliveredToday, unpaid }
  }, [initialDeliveries])

  // ── Clients filtrés ─────────────────────────────────────────────────
  const filteredCustomers = React.useMemo(() => {
    const list = initialCustomers ?? []
    if (!customerSearch.trim()) return list
    const q = customerSearch.toLowerCase()
    return list.filter(c => c.name.toLowerCase().includes(q) || c.phone.includes(q))
  }, [initialCustomers, customerSearch])

  // ── Compteurs de livraisons en attente par client ───────────────────
  const customerPendingCounts = React.useMemo(() => {
    const counts: Record<number | string, number> = {}
    initialDeliveries.forEach(d => {
      if (
        d.status !== "CANCELLED" &&
        (d.status === "PENDING" ||
          d.status === "IN_PROGRESS" ||
          d.payment_status === "UNPAID" ||
          d.payment_status === "PARTIAL")
      ) {
        // Trouver le client associé
        const customer = (initialCustomers ?? []).find(c => {
          if (d.customer_id != null && c.id != null) {
            return Number(d.customer_id) === Number(c.id)
          }
          return d.customer_phone === c.phone
        })
        if (customer) {
          counts[customer.id] = (counts[customer.id] || 0) + 1
        }
      }
    })
    return counts
  }, [initialDeliveries, initialCustomers])

  // ── Livraisons du client sélectionné ───────────────────────────────
  const clientDeliveries = React.useMemo(() => {
    if (!selectedCustomer) return []
    return initialDeliveries.filter(d => {
      // Filtrage par customer_id (livraisons récentes)
      if (d.customer_id != null && selectedCustomer.id != null) {
        return Number(d.customer_id) === Number(selectedCustomer.id)
      }
      // Fallback : filtrage par numéro de téléphone (anciennes livraisons sans customer_id)
      return d.customer_phone === selectedCustomer.phone
    })
  }, [initialDeliveries, selectedCustomer])

  // ── Stats client ────────────────────────────────────────────────────
  const clientStats = React.useMemo(() => {
    let pending = 0, inProgress = 0, deliveredToday = 0, unpaid = 0
    clientDeliveries.forEach(d => {
      if (d.status === "PENDING") pending++
      if (d.status === "IN_PROGRESS") inProgress++
      if (d.status === "DELIVERED" && d.delivered_at && isToday(new Date(d.delivered_at))) deliveredToday++
      if (d.payment_status === "UNPAID") unpaid++
    })
    return { pending, inProgress, deliveredToday, unpaid }
  }, [clientDeliveries])

  const handleOpenClient = (customer: Customer) => {
    setSelectedCustomer(customer)
    setView("client-space")
  }

  const handleOpenDetails = async (deliveryId: number) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await (window as any).electron.invoke("deliveries:getById", deliveryId)
      if (res?.success) {
        setDeliveryDetails(res.data)
        setView("delivery-detail")
      } else {
        const found = (selectedCustomer ? clientDeliveries : initialDeliveries).find(d => d.id === deliveryId)
        if (found) { setDeliveryDetails(found); setView("delivery-detail") }
      }
    } catch {
      const found = (selectedCustomer ? clientDeliveries : initialDeliveries).find(d => d.id === deliveryId)
      if (found) { setDeliveryDetails(found); setView("delivery-detail") }
    }
  }

  // Delivery detail view
  if (view === "delivery-detail") {
    return (
      <>
        <TopbarBreadcrumb
          view={view}
          customer={selectedCustomer}
          onBack={() => setView(selectedCustomer ? "client-space" : "customers")}
        />
        <DeliveryDetailsView
          open={true}
          delivery={deliveryDetails}
          onClose={() => setView(selectedCustomer ? "client-space" : "customers")}
          onRefresh={() => {
            setView(selectedCustomer ? "client-space" : "customers")
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if ((window as any).__refreshDeliveries) (window as any).__refreshDeliveries()
            window.dispatchEvent(new CustomEvent("deliveries-updated"))
          }}
        />
      </>
    )
  }

  // Client space view
  if (view === "client-space" && selectedCustomer) {
    return (
      <>
        <TopbarBreadcrumb
          view={view}
          customer={selectedCustomer}
          onBack={() => { setView("customers"); setSelectedCustomer(null) }}
        />
        <ClientSpaceView
          customer={selectedCustomer}
          deliveries={clientDeliveries}
          stats={clientStats}
          onBack={() => { setView("customers"); setSelectedCustomer(null) }}
          onOpenDetails={handleOpenDetails}
        />
      </>
    )
  }

  // Default: Customer grid view
  return (
    <>
      <TopbarBreadcrumb
        view={view}
        customer={null}
        onBack={() => { }}
      />
      <div className="@container/main flex flex-col gap-4 md:gap-6 w-full min-w-0">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Livraisons</h1>
            <p className="text-muted-foreground text-sm">
              Gérez vos livraisons, suivez l&apos;état d&apos;expédition et les paiements restants.
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="h-9 pl-8"
              placeholder="Rechercher un client..."
              value={customerSearch}
              onChange={e => setCustomerSearch(e.target.value)}
            />
          </div>
        </div>

        {/* ── Stats Cards (globales) ──────────────────────────────────────── 
      <StatsCards stats={globalStats} />
      */}
        {/* ── Grille Clients ─────────────────────────────────────────────── */}
        <div className="mt-2">
          {/*<h2 className="text-2xl font-bold tracking-tight mb-6">Mes clients</h2>*/}
          {filteredCustomers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <p className="text-sm">
                {customerSearch ? "Aucun client trouvé pour cette recherche." : "Aucun client enregistré"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-6">
              {filteredCustomers.map(customer => {
                const pendingCount = customerPendingCounts[customer.id] || 0;
                return (
                  <button
                    key={customer.id}
                    type="button"
                    onClick={() => handleOpenClient(customer)}
                    className="flex flex-col items-center gap-3 group cursor-pointer focus:outline-none"
                  >
                    <div className="relative w-28 h-24 sm:w-32 sm:h-28 transition-transform duration-150 group-hover:scale-105 group-hover:brightness-95">
                      <Image src="/folder.png" alt="dossier" fill className="object-contain" draggable={false} />
                      {pendingCount > 0 && (
                        <div className="absolute top-1 sm:top-2 right-1 sm:right-2 flex h-5 sm:h-6 min-w-[20px] sm:min-w-[24px] items-center justify-center rounded-full bg-red-500 px-1 text-[11px] sm:text-xs font-semibold text-white tabular-nums border-[1.5px] border-white shadow-sm z-10">
                          {pendingCount > 99 ? "99+" : pendingCount}
                        </div>
                      )}
                    </div>
                    <div className="text-center max-w-[130px]">
                      <p className="text-[15px] font-medium text-gray-900 leading-tight truncate w-full" title={customer.name}>
                        {customer.name}
                      </p>
                      <p className="text-[13px] text-gray-500 truncate w-full" title={customer.phone}>
                        {customer.phone}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   Stats Cards (réutilisable)
───────────────────────────────────────────────────────────────────────────── */
function StatsCards({ stats }: { stats: { pending: number; inProgress: number; deliveredToday: number; unpaid: number } }) {
  return (
    <TooltipProvider>
      <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs xl:grid-cols-4 dark:*:data-[slot=card]:bg-card">
        {[
          { label: "En attente", value: stats.pending, Icon: Clock, tooltip: `${stats.pending} livraison(s) en attente` },
          { label: "En cours", value: stats.inProgress, Icon: Truck, tooltip: `${stats.inProgress} livraison(s) en cours` },
          { label: "Livrées aujourd'hui", value: stats.deliveredToday, Icon: CheckCircle2, tooltip: `${stats.deliveredToday} terminée(s) aujourd'hui` },
          { label: "Impayées", value: stats.unpaid, Icon: AlertTriangle, tooltip: `${stats.unpaid} livraison(s) impayée(s)` },
        ].map(({ label, value, Icon, tooltip }) => (
          <Card key={label}>
            <CardHeader className="pb-2">
              <CardTitle>
                <div className="flex size-7 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
                  <Icon className="size-4" />
                </div>
              </CardTitle>
              <CardDescription>{label}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-1 w-full overflow-hidden">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="font-medium text-3xl tabular-nums leading-none tracking-tight truncate max-w-full">{value}</div>
                </TooltipTrigger>
                <TooltipContent><p>{tooltip}</p></TooltipContent>
              </Tooltip>
            </CardContent>
          </Card>
        ))}
      </div>
    </TooltipProvider>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   Espace client
───────────────────────────────────────────────────────────────────────────── */
function ClientSpaceView({
  customer,
  deliveries,
  stats,
  onBack,
  onOpenDetails,
}: {
  customer: Customer
  deliveries: Delivery[]
  stats: { pending: number; inProgress: number; deliveredToday: number; unpaid: number }
  onBack: () => void
  onOpenDetails: (id: number) => void
}) {
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = React.useState("")
  const [searchTerm, setSearchTerm] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState("ALL")
  const [paymentFilter, setPaymentFilter] = React.useState("ALL")
  const [dateFrom, setDateFrom] = React.useState<Date | undefined>(undefined)
  const [dateTo, setDateTo] = React.useState<Date | undefined>(undefined)
  const [pagination, setPagination] = React.useState<PaginationState>({ pageIndex: 0, pageSize: 20 })

  const filteredData = React.useMemo(() => {
    return deliveries.filter(d => {
      const matchStatus = statusFilter === "ALL" || d.status === statusFilter
      const matchPayment = paymentFilter === "ALL" || d.payment_status === paymentFilter
      let matchDate = true
      if (dateFrom && d.delivery_date) matchDate = d.delivery_date >= format(dateFrom, "yyyy-MM-dd")
      if (matchDate && dateTo && d.delivery_date) matchDate = d.delivery_date <= format(dateTo, "yyyy-MM-dd")
      return matchStatus && matchPayment && matchDate
    })
  }, [deliveries, statusFilter, paymentFilter, dateFrom, dateTo])

  // Colonnes sans "Client" ni "Téléphone"
  const columns = React.useMemo<ColumnDef<Delivery>[]>(() => [
    {
      accessorKey: "reference",
      header: "Réf",
      cell: ({ row }) => <span className="font-medium text-black">{row.original.reference}</span>,
    },
    {
      accessorKey: "delivery_date",
      header: "Date",
      cell: ({ row }) => (
        <span className="whitespace-nowrap">{format(new Date(row.original.delivery_date), "dd/MM/yyyy")}</span>
      ),
    },
    {
      accessorKey: "total_amount",
      header: "Total",
      cell: ({ row }) => <span className="font-medium">{formatCurrency(row.original.total_amount)}</span>,
    },
    {
      accessorKey: "amount_paid",
      header: "Payé",
      cell: ({ row }) => <span className="text-gray-600">{formatCurrency(row.original.amount_paid)}</span>,
    },
    {
      id: "reste_du",
      header: "Reste dû",
      cell: ({ row }) => {
        if (row.original.status === "CANCELLED") return <span className="text-gray-400">-</span>
        const reste = Math.max(0, row.original.total_amount - row.original.amount_paid)
        if (reste > 0 && row.original.status === "DELIVERED") {
          return <div className="flex items-center gap-1 text-red-600 font-bold whitespace-nowrap">{formatCurrency(reste)} <AlertTriangle className="h-3 w-3" /></div>
        }
        if (reste > 0) return <div className="text-orange-600 font-medium whitespace-nowrap">{formatCurrency(reste)}</div>
        return <div className="flex items-center gap-1 text-green-600 font-medium whitespace-nowrap">{formatCurrency(0)} <CheckCircle2 className="h-3 w-3" /></div>
      },
    },
    {
      accessorKey: "status",
      header: "Livraison",
      cell: ({ row }) => {
        const conf = DELIVERY_STATUS_MAP[row.original.status]
        return conf
          ? <Badge variant="outline" className={`border-transparent ${conf.classes}`}>{conf.label}</Badge>
          : <span>{row.original.status}</span>
      },
    },
    {
      accessorKey: "payment_status",
      header: "Paiement",
      cell: ({ row }) => {
        if (row.original.status === "CANCELLED") return <span className="text-gray-400">-</span>
        const conf = PAYMENT_STATUS_MAP[row.original.payment_status]
        return conf
          ? <Badge variant="outline" className={`border-transparent ${conf.classes}`}>{conf.label}</Badge>
          : null
      },
    },
    {
      id: "actions",
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onOpenDetails(row.original.id)}>
                Voir détails
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ], [onOpenDetails])

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable<Delivery>({
    data: filteredData,
    columns,
    state: { columnFilters, globalFilter, pagination },
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: "includesString",
  })

  React.useEffect(() => {
    const timer = setTimeout(() => {
      table.setGlobalFilter(searchTerm || undefined)
      table.setPageIndex(0)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm, table])

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6 w-full min-w-0 pt-2">

      {/* Header client / Livraisons */}
      <div className="flex flex-col gap-0.5 mb-2">
        <h1 className="text-2xl font-bold tracking-tight">Livraisons</h1>
        <p className="text-muted-foreground text-sm">
          Gérez vos livraisons, suivez l&apos;état d&apos;expédition et les paiements restants.
        </p>
      </div>

      {/* Stats cards (filtrées) */}
      <StatsCards stats={stats} />

      {/* Tableau */}
      <Card className="shadow-none w-full min-w-0">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="h-9 w-44 md:w-64 pl-8"
                placeholder="Rechercher par réf, date..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>

            <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); table.setPageIndex(0) }}>
              <SelectTrigger className="h-9 w-40"><SelectValue placeholder="Statut" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tous les statuts</SelectItem>
                <SelectItem value="PENDING">En attente</SelectItem>
                <SelectItem value="IN_PROGRESS">En cours</SelectItem>
                <SelectItem value="DELIVERED">Livrées</SelectItem>
                <SelectItem value="CANCELLED">Annulées</SelectItem>
              </SelectContent>
            </Select>

            <Select value={paymentFilter} onValueChange={v => { setPaymentFilter(v); table.setPageIndex(0) }}>
              <SelectTrigger className="h-9 w-40"><SelectValue placeholder="Paiement" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tous paiements</SelectItem>
                <SelectItem value="UNPAID">Impayées</SelectItem>
                <SelectItem value="PARTIAL">Partielles</SelectItem>
                <SelectItem value="PAID">Payées</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2 ml-auto">
              <span className="text-sm text-muted-foreground">Du</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="h-9 w-[140px] justify-start text-left font-normal">
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
                  <Button variant="outline" className="h-9 w-[140px] justify-start text-left font-normal">
                    <CalendarDays className="mr-2 size-4 text-muted-foreground" />
                    {dateTo ? format(dateTo, "dd MMM yyyy", { locale: fr }) : <span className="text-muted-foreground">Choisir...</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dateTo} onSelect={setDateTo} locale={fr} />
                </PopoverContent>
              </Popover>
              {(dateFrom || dateTo) && (
                <Button variant="ghost" size="icon" className="size-8" onClick={() => { setDateFrom(undefined); setDateTo(undefined) }}>
                  <X className="size-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-lg border">
              <Table className="**:data-[slot='table-cell']:px-6 **:data-[slot='table-head']:px-6 **:data-[slot='table-cell']:py-4">
                <TableHeader className="border-t **:data-[slot='table-head']:h-11 **:data-[slot='table-head']:font-medium **:data-[slot='table-head']:text-foreground **:data-[slot='table-head']:text-sm bg-muted/20">
                  {table.getHeaderGroups().map(hg => (
                    <TableRow key={hg.id}>
                      {hg.headers.map((header: import("@tanstack/react-table").Header<Delivery, unknown>) => (
                        <TableHead key={header.id} colSpan={header.colSpan}>
                          {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody className="**:data-[slot='table-row']:border-border/50 **:data-[slot='table-row']:hover:bg-muted/10">
                  {table.getRowModel().rows.length ? (
                    table.getRowModel().rows.map((row: import("@tanstack/react-table").Row<Delivery>) => (
                      <TableRow key={row.id}>
                        {row.getVisibleCells().map((cell: import("@tanstack/react-table").Cell<Delivery, unknown>) => (
                          <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground">
                        Aucune livraison pour ce client.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 pb-2 pt-2">
              <div className="flex items-center gap-2">
                <Label className="text-muted-foreground text-sm">Lignes par page</Label>
                <Select value={`${table.getState().pagination.pageSize}`} onValueChange={v => table.setPageSize(Number(v))}>
                  <SelectTrigger size="sm" className="w-20"><SelectValue /></SelectTrigger>
                  <SelectContent side="top">
                    <SelectGroup>
                      {[10, 20, 30, 50].map(s => <SelectItem key={s} value={`${s}`}>{s}</SelectItem>)}
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
        </CardContent>
      </Card>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   Topbar Breadcrumb (Portal)
───────────────────────────────────────────────────────────────────────────── */
function TopbarBreadcrumb({
  view,
  customer,
  onBack
}: {
  view: "customers" | "client-space" | "delivery-detail"
  customer: Customer | null
  onBack: () => void
}) {
  const [container, setContainer] = React.useState<HTMLElement | null>(null)

  React.useEffect(() => {
    setContainer(document.getElementById("topbar-breadcrumb-container"))
  }, [])

  if (!container) return null

  return createPortal(
    <div className="flex items-center text-sm ml-2">
      <div className="flex items-center gap-4 mr-6 text-muted-foreground">
        <button onClick={onBack} disabled={view === "customers"} className="hover:text-foreground disabled:opacity-30 transition-opacity">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <button disabled className="opacity-30">
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
      <nav className="flex items-center gap-2 text-muted-foreground font-medium">
        <button onClick={onBack} disabled={view === "customers"} className={view === "customers" ? "text-foreground" : "hover:text-foreground transition-colors"}>
          Livraisons
        </button>
        {(view === "client-space" || view === "delivery-detail") && customer && (
          <>
            <ChevronRight className="h-4 w-4" />
            <span className={view === "client-space" ? "text-foreground" : "hover:text-foreground transition-colors"}>
              {customer.name}
            </span>
          </>
        )}
      </nav>
    </div>,
    container
  )
}
