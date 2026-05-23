"use client"
import * as React from "react"
import Link from "next/link"
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
import { MoreHorizontal, Search, Truck, Clock, AlertTriangle, CheckCircle2, CalendarDays, X, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"

export interface Delivery {
  id: number
  reference: string
  sale_id: number
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
}

function preventPaginationNavigation(event: React.MouseEvent<HTMLAnchorElement>) {
  event.preventDefault()
}

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF", minimumFractionDigits: 0 })
    .format(val)
    .replace("XOF", "FCFA");
};

const PAYMENT_STATUS_MAP: Record<string, { label: string, classes: string }> = {
  UNPAID: { label: "Impayé", classes: "bg-red-100 text-red-800 hover:bg-red-200" },
  PARTIAL: { label: "Partiel", classes: "bg-orange-100 text-orange-800 hover:bg-orange-200" },
  PAID: { label: "Payé", classes: "bg-green-100 text-green-800 hover:bg-green-200" },
}

const DELIVERY_STATUS_MAP: Record<string, string> = {
  PENDING: "En attente",
  IN_PROGRESS: "En cours",
  DELIVERED: "Livrée",
  CANCELLED: "Annulée",
}

export function LivraisonsClient({ initialDeliveries }: { initialDeliveries: Delivery[] }) {
  const [rowSelection, setRowSelection] = React.useState({})
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])

  // Search debounce
  const [globalFilter, setGlobalFilter] = React.useState("")
  const [searchTerm, setSearchTerm] = React.useState("")

  // Select filters
  const [statusFilter, setStatusFilter] = React.useState("ALL")
  const [paymentFilter, setPaymentFilter] = React.useState("ALL")
  const [dateFrom, setDateFrom] = React.useState<Date | undefined>(undefined)
  const [dateTo, setDateTo] = React.useState<Date | undefined>(undefined)

  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  })

  // Calculate Stats
  const stats = React.useMemo(() => {
    let pending = 0;
    let inProgress = 0;
    let deliveredToday = 0;
    let unpaid = 0;

    initialDeliveries.forEach(d => {
      if (d.status === 'PENDING') pending++;
      if (d.status === 'IN_PROGRESS') inProgress++;
      if (d.status === 'DELIVERED' && d.delivered_at && isToday(new Date(d.delivered_at))) deliveredToday++;
      if (d.payment_status === 'UNPAID') unpaid++;
    });

    return { pending, inProgress, deliveredToday, unpaid };
  }, [initialDeliveries]);

  // Apply Select Filters + Date Range
  const filteredData = React.useMemo(() => {
    return initialDeliveries.filter(d => {
      const matchStatus = statusFilter === "ALL" || d.status === statusFilter;
      const matchPayment = paymentFilter === "ALL" || d.payment_status === paymentFilter;

      let matchDate = true;
      if (dateFrom && d.delivery_date) {
        const from = format(dateFrom, "yyyy-MM-dd");
        matchDate = d.delivery_date >= from;
      }
      if (matchDate && dateTo && d.delivery_date) {
        const to = format(dateTo, "yyyy-MM-dd");
        matchDate = d.delivery_date <= to;
      }

      return matchStatus && matchPayment && matchDate;
    });
  }, [initialDeliveries, statusFilter, paymentFilter, dateFrom, dateTo]);

  const columns = React.useMemo<ColumnDef<Delivery>[]>(
    () => [
      {
        accessorKey: "reference",
        header: "Réf",
        cell: ({ row }) => <span className="font-medium text-primary">{row.original.reference}</span>,
      },
      {
        accessorKey: "customer_name",
        header: "Client",
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium max-w-[150px] truncate" title={row.original.customer_name}>
              {row.original.customer_name}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "customer_phone",
        header: "Tél",
      },
      {
        accessorKey: "delivery_date",
        header: "Date",
        cell: ({ row }) => (
          <span className="whitespace-nowrap">
            {format(new Date(row.original.delivery_date), "dd/MM/yyyy")}
          </span>
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
          const reste = Math.max(0, row.original.total_amount - row.original.amount_paid);
          const isDelivered = row.original.status === 'DELIVERED';

          if (reste > 0 && isDelivered) {
            return (
              <div className="flex items-center gap-1 text-red-600 font-bold whitespace-nowrap">
                {formatCurrency(reste)} <AlertTriangle className="h-3 w-3" />
              </div>
            );
          }
          if (reste > 0) {
            return <div className="text-orange-600 font-medium whitespace-nowrap">{formatCurrency(reste)}</div>;
          }
          return (
            <div className="flex items-center gap-1 text-green-600 font-medium whitespace-nowrap">
              {formatCurrency(0)} <CheckCircle2 className="h-3 w-3" />
            </div>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Livraison",
        cell: ({ row }) => {
          const status = row.original.status;
          return <span className="text-sm">{DELIVERY_STATUS_MAP[status] || status}</span>;
        },
      },
      {
        accessorKey: "payment_status",
        header: "Paiement",
        cell: ({ row }) => {
          const conf = PAYMENT_STATUS_MAP[row.original.payment_status];
          if (!conf) return null;
          return (
            <Badge variant="outline" className={`border-transparent ${conf.classes}`}>
              {conf.label}
            </Badge>
          );
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
                <DropdownMenuItem asChild>
                  <Link href={`#`} onClick={(e) => { e.preventDefault(); alert("TODO: Détails livraison"); }}>
                    Voir détails
                  </Link>
                </DropdownMenuItem>
                {row.original.status !== 'DELIVERED' && row.original.status !== 'CANCELLED' && (
                  <DropdownMenuItem onClick={() => alert("TODO: Changer statut")}>
                    Mettre à jour statut
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    []
  )

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      rowSelection,
      columnFilters,
      globalFilter,
      pagination,
    },
    getRowId: (row) => String(row.id),
    onRowSelectionChange: setRowSelection,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: "includesString",
  })

  // Apply debounce for search input
  React.useEffect(() => {
    const timer = setTimeout(() => {
      table.setGlobalFilter(searchTerm || undefined)
      table.setPageIndex(0)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm, table])

  const currentPage = table.getState().pagination.pageIndex + 1
  const pageCount = table.getPageCount()
  const filteredCount = table.getFilteredRowModel().rows.length

  const pageNumbers = React.useMemo(() => {
    if (pageCount <= 3) {
      return Array.from({ length: pageCount }, (_, index) => index + 1)
    }
    if (currentPage <= 2) return [1, 2, 3]
    if (currentPage >= pageCount - 1) return [pageCount - 2, pageCount - 1, pageCount]
    return [currentPage - 1, currentPage, currentPage + 1]
  }, [currentPage, pageCount])

  const startIndex = filteredCount === 0 ? 0 : table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1
  const endIndex = Math.min(startIndex + table.getState().pagination.pageSize - 1, filteredCount)

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6 w-full min-w-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Livraisons</h1>
            <p className="text-muted-foreground text-sm">
              Gérez vos livraisons, suivez l'état d'expédition et les paiements restants.
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <TooltipProvider>
        <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs xl:grid-cols-4 dark:*:data-[slot=card]:bg-card">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>
                <div className="flex size-7 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
                  <Clock className="size-4" />
                </div>
              </CardTitle>
              <CardDescription>En attente</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-1 w-full overflow-hidden">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="font-medium text-3xl tabular-nums leading-none tracking-tight truncate max-w-full">
                    {stats.pending}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{stats.pending} livraison(s) en attente</p>
                </TooltipContent>
              </Tooltip>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle>
                <div className="flex size-7 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
                  <Truck className="size-4" />
                </div>
              </CardTitle>
              <CardDescription>En cours</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-1 w-full overflow-hidden">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="font-medium text-3xl tabular-nums leading-none tracking-tight truncate max-w-full">
                    {stats.inProgress}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{stats.inProgress} livraison(s) en cours</p>
                </TooltipContent>
              </Tooltip>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle>
                <div className="flex size-7 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
                  <CheckCircle2 className="size-4" />
                </div>
              </CardTitle>
              <CardDescription>Livrées aujourd'hui</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-1 w-full overflow-hidden">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="font-medium text-3xl tabular-nums leading-none tracking-tight truncate max-w-full">
                    {stats.deliveredToday}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{stats.deliveredToday} livraison(s) terminée(s) aujourd'hui</p>
                </TooltipContent>
              </Tooltip>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle>
                <div className="flex size-7 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
                  <AlertTriangle className="size-4" />
                </div>
              </CardTitle>
              <CardDescription>Impayées</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-1 w-full overflow-hidden">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="font-medium text-3xl tabular-nums leading-none tracking-tight truncate max-w-full">
                    {stats.unpaid}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{stats.unpaid} livraison(s) avec paiement en attente</p>
                </TooltipContent>
              </Tooltip>
            </CardContent>
          </Card>
        </div>
      </TooltipProvider>

      {/* Table Section */}
      <Card className="shadow-none w-full min-w-0">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="h-9 w-44 md:w-64 pl-8"
                placeholder="Rechercher par réf, nom..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>

            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value)
                table.setPageIndex(0)
              }}
            >
              <SelectTrigger className="h-9 w-40">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tous les statuts</SelectItem>
                <SelectItem value="PENDING">En attente</SelectItem>
                <SelectItem value="IN_PROGRESS">En cours</SelectItem>
                <SelectItem value="DELIVERED">Livrées</SelectItem>
                <SelectItem value="CANCELLED">Annulées</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={paymentFilter}
              onValueChange={(value) => {
                setPaymentFilter(value)
                table.setPageIndex(0)
              }}
            >
              <SelectTrigger className="h-9 w-40">
                <SelectValue placeholder="Paiement" />
              </SelectTrigger>
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
        </CardHeader>

        <CardContent className="pt-0">
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-lg border">
              <Table className="**:data-[slot='table-cell']:px-6 **:data-[slot='table-head']:px-6 **:data-[slot='table-cell']:py-4">
                <TableHeader className="border-t **:data-[slot='table-head']:h-11 **:data-[slot='table-head']:font-medium **:data-[slot='table-head']:text-foreground **:data-[slot='table-head']:text-sm bg-muted/20">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id} colSpan={header.colSpan}>
                          {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody className="**:data-[slot='table-row']:border-border/50 **:data-[slot='table-row']:hover:bg-muted/10">
                  {table.getRowModel().rows.length ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground">
                        Aucune livraison trouvée.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 pb-2 pt-2">
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
        </CardContent>
      </Card>
    </div>
  )
}
