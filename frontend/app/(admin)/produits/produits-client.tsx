"use client"
import * as React from "react"
import Link from "next/link"

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
import { ChevronDownIcon, ListFilter, MoreHorizontal, Plus, Search, Image as ImageIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
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

export interface Product {
  id: number
  reference: string
  name: string
  category_id: number
  brand_id: number
  category_name?: string
  brand_name?: string
  sale_price: number
  quantity: number
  min_stock: number
  photos?: string
}

function preventPaginationNavigation(event: React.MouseEvent<HTMLAnchorElement>) {
  event.preventDefault()
}

export function ProduitsClient({ initialProducts }: { initialProducts: Product[] }) {
  const [rowSelection, setRowSelection] = React.useState({})
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])

  // Custom price range state
  const [minPrice, setMinPrice] = React.useState<string>("")
  const [maxPrice, setMaxPrice] = React.useState<string>("")

  // Search debounce
  const [globalFilter, setGlobalFilter] = React.useState("")
  const [searchTerm, setSearchTerm] = React.useState("")

  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })

  // Extract unique categories and brands for filters
  const categoryOptions = React.useMemo(() => {
    const categories = initialProducts.map((p) => p.category_name).filter(Boolean) as string[]
    return Array.from(new Set(categories)).sort()
  }, [initialProducts])

  const brandOptions = React.useMemo(() => {
    const brands = initialProducts.map((p) => p.brand_name).filter(Boolean) as string[]
    return Array.from(new Set(brands)).sort()
  }, [initialProducts])

  const columns = React.useMemo<ColumnDef<Product>[]>(
    () => [
      {
        accessorKey: "photos",
        header: "Photo",
        cell: ({ row }) => {
          let photoUrl: string | null = null
          if (row.original.photos) {
            try {
              const parsed = typeof row.original.photos === "string" ? JSON.parse(row.original.photos) : row.original.photos;
              if (Array.isArray(parsed) && parsed.length > 0) {
                const first = parsed[0]
                if (typeof first === 'string' && first.trim() !== '') {
                  photoUrl = first.startsWith('http') ? first : `http://localhost:4000${first}`
                }
              } else if (typeof parsed === 'string' && parsed.trim() !== '') {
                const raw = parsed.trim()
                photoUrl = raw.startsWith('http') ? raw : `http://localhost:4000${raw}`
              }
            } catch (e) {
              const raw = String(row.original.photos).trim()
              if (raw !== '') {
                  photoUrl = raw.startsWith('http') ? raw : `http://localhost:4000${raw}`
              }
            }
          }
          return (
            <div className="relative h-12 w-12 overflow-hidden rounded-md border bg-muted flex items-center justify-center">
              {photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photoUrl}
                  alt={row.original.name}
                  className="h-full w-full object-cover"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/placeholder-product.png' }}
                />
              ) : (
                <ImageIcon className="h-6 w-6 text-muted-foreground/50" />
              )}
            </div>
          )
        },
        enableGlobalFilter: false,
      },
      {
        accessorKey: "name",
        header: "Nom",
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium">{row.original.name}</span>
            <span className="text-xs text-muted-foreground">{row.original.reference}</span>
          </div>
        ),
      },
      {
        accessorKey: "brand_name",
        header: "Marque",
        cell: ({ row }) => <div>{row.original.brand_name || "—"}</div>,
        filterFn: "equalsString",
      },
      {
        accessorKey: "category_name",
        header: "Catégorie",
        cell: ({ row }) => <div>{row.original.category_name || "—"}</div>,
        filterFn: "equalsString",
      },
      {
        accessorKey: "sale_price",
        header: "Prix",
        cell: ({ row }) => (
          <div className="font-medium tabular-nums">
            {Number(row.original.sale_price).toLocaleString("fr-FR")} FCFA
          </div>
        ),
        filterFn: (row, id, value) => {
          const price = Number(row.getValue(id))
          const [min, max] = value as [number | undefined, number | undefined]
          if (min !== undefined && price < min) return false
          if (max !== undefined && price > max) return false
          return true
        },
      },
      {
        accessorKey: "quantity",
        header: "Stock",
        cell: ({ row }) => {
          const q = row.original.quantity
          const min = row.original.min_stock
          const isLow = q < min
          return (
            <Badge
              variant="outline"
              className={isLow 
                ? "bg-red-500/15 text-red-700 hover:bg-red-500/25 border-transparent dark:text-red-400" 
                : "bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25 border-transparent dark:text-emerald-400"}
            >
              <span className={`mr-1 inline-block size-1.5 rounded-full ${isLow ? "bg-red-500" : "bg-emerald-500"}`} />
              {q}
            </Badge>
          )
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
                  <span className="sr-only">Ouvrir le menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={`/produits/${row.original.id}`}>Voir détails</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/produits/${row.original.id}/modifier`}>Modifier ce produit</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    []
  )

  const table = useReactTable({
    data: initialProducts,
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

  // Apply price range filter
  React.useEffect(() => {
    const min = minPrice !== "" ? Number(minPrice) : undefined
    const max = maxPrice !== "" ? Number(maxPrice) : undefined

    if (min === undefined && max === undefined) {
      table.getColumn("sale_price")?.setFilterValue(undefined)
    } else {
      table.getColumn("sale_price")?.setFilterValue([min, max])
    }
  }, [minPrice, maxPrice, table])

  const categoryFilter = (table.getColumn("category_name")?.getFilterValue() as string) ?? "all"
  const brandFilter = (table.getColumn("brand_name")?.getFilterValue() as string) ?? "all"

  const currentPage = table.getState().pagination.pageIndex + 1
  const pageCount = table.getPageCount()
  const filteredCount = table.getFilteredRowModel().rows.length

  // Custom pagination window
  const pageNumbers = React.useMemo(() => {
    if (pageCount <= 3) {
      return Array.from({ length: pageCount }, (_, index) => index + 1)
    }
    if (currentPage <= 2) return [1, 2, 3]
    if (currentPage >= pageCount - 1) return [pageCount - 2, pageCount - 1, pageCount]
    return [currentPage - 1, currentPage, currentPage + 1]
  }, [currentPage, pageCount])

  // Calculate start and end indices for "X-Y sur Z produits"
  const startIndex = filteredCount === 0 ? 0 : table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1
  const endIndex = Math.min(startIndex + table.getState().pagination.pageSize - 1, filteredCount)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Produits</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gérez votre inventaire, ajoutez de nouveaux produits et mettez à jour les stocks.
          </p>
        </div>
        <Button asChild>
          <Link href="/produits/nouveau">
            <Plus className="mr-2 size-4" />
            Nouveau produit
          </Link>
        </Button>
      </div>

      <section>
        <Card className="shadow-none">
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="h-9 w-44 md:w-64 pl-8"
                  placeholder="Rechercher par nom, réf..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </div>

              {categoryOptions.length > 0 && (
                <Select
                  value={categoryFilter}
                  onValueChange={(value) => {
                    table.getColumn("category_name")?.setFilterValue(value === "all" ? undefined : value)
                    table.setPageIndex(0)
                  }}
                >
                  <SelectTrigger className="h-9 w-40">
                    <SelectValue placeholder="Catégorie" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les catégories</SelectItem>
                    {categoryOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {brandOptions.length > 0 && (
                <Select
                  value={brandFilter}
                  onValueChange={(value) => {
                    table.getColumn("brand_name")?.setFilterValue(value === "all" ? undefined : value)
                    table.setPageIndex(0)
                  }}
                >
                  <SelectTrigger className="h-9 w-40">
                    <SelectValue placeholder="Marque" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les marques</SelectItem>
                    {brandOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <div className="flex items-center gap-2 ml-auto">
                <span className="text-sm text-muted-foreground mr-1">Prix:</span>
                <Input
                  type="number"
                  placeholder="Min"
                  value={minPrice}
                  onChange={e => setMinPrice(e.target.value)}
                  className="h-9 w-20"
                />
                <span className="text-muted-foreground">-</span>
                <Input
                  type="number"
                  placeholder="Max"
                  value={maxPrice}
                  onChange={e => setMaxPrice(e.target.value)}
                  className="h-9 w-20"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 px-0">
            <div className="overflow-x-auto">
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
                        Aucun produit trouvé.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 pb-2 pt-2">
              <p className="text-muted-foreground text-sm">
                {filteredCount > 0 ? (
                  <>Affichage {startIndex}-{endIndex} sur {filteredCount} produits</>
                ) : (
                  <>Aucun produit visible</>
                )}
              </p>

              <Pagination className="mx-0 w-auto justify-end">
                <PaginationContent className="gap-1.5">
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      className={!table.getCanPreviousPage() ? "pointer-events-none opacity-50" : undefined}
                      onClick={(event) => {
                        preventPaginationNavigation(event)
                        table.previousPage()
                      }}
                    />
                  </PaginationItem>
                  {pageNumbers[0] > 1 ? (
                    <PaginationItem>
                      <PaginationEllipsis />
                    </PaginationItem>
                  ) : null}
                  {pageNumbers.map((pageNumber) => (
                    <PaginationItem key={`page-${pageNumber}`}>
                      <PaginationLink
                        href="#"
                        isActive={table.getState().pagination.pageIndex === pageNumber - 1}
                        onClick={(event) => {
                          preventPaginationNavigation(event)
                          table.setPageIndex(pageNumber - 1)
                        }}
                      >
                        {pageNumber}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  {pageNumbers[pageNumbers.length - 1] < pageCount ? (
                    <PaginationItem>
                      <PaginationEllipsis />
                    </PaginationItem>
                  ) : null}
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      className={!table.getCanNextPage() ? "pointer-events-none opacity-50" : undefined}
                      onClick={(event) => {
                        preventPaginationNavigation(event)
                        table.nextPage()
                      }}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
