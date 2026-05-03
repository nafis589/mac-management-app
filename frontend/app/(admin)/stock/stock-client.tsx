"use client"
import * as React from "react"
import { useRouter } from "next/navigation"
import { Package, AlertTriangle, ArrowRightLeft, Image as ImageIcon, Search, ArrowUpRight, ArrowDownRight, Loader2, Plus } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const API_BASE = "http://localhost:4000/api"

export interface DashboardData {
  totalProducts: number
  stockValue: number
  lowStockCount: number
}

export interface Product {
  id: number
  reference: string
  name: string
  quantity: number
  min_stock: number
  photos?: string
}

export interface StockMovement {
  id: number
  product_id: number
  product_name: string
  product_reference: string
  type: "IN" | "OUT"
  quantity: number
  user_name: string
  created_at: string
}

function getPhotoUrl(photosRaw: any) {
  if (!photosRaw) return null
  try {
    const parsed = typeof photosRaw === "string" ? JSON.parse(photosRaw) : photosRaw
    if (Array.isArray(parsed) && parsed.length > 0) {
      const first = parsed[0]
      if (typeof first === "string" && first.trim() !== "") {
        return first.startsWith("http") ? first : `http://localhost:4000${first}`
      }
    } else if (typeof parsed === "string" && parsed.trim() !== "") {
      const raw = parsed.trim()
      return raw.startsWith("http") ? raw : `http://localhost:4000${raw}`
    }
  } catch (e) {
    const raw = String(photosRaw).trim()
    if (raw !== "") {
      return raw.startsWith("http") ? raw : `http://localhost:4000${raw}`
    }
  }
  return null
}

export function StockClient({
  initialDashboard,
  initialAlerts,
  initialMovements,
}: {
  initialDashboard: DashboardData
  initialAlerts: Product[]
  initialMovements: StockMovement[]
}) {
  const router = useRouter()

  // Reappro Modal State
  const [selectedProduct, setSelectedProduct] = React.useState<Product | null>(null)
  const [addQuantity, setAddQuantity] = React.useState<string>("1")
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isModalOpen, setIsModalOpen] = React.useState(false)

  // Movements Filters
  const [movementType, setMovementType] = React.useState<string>("all")
  const [movementSearch, setMovementSearch] = React.useState("")

  // Pagination state
  const [alertsPage, setAlertsPage] = React.useState(0)
  const [historyPage, setHistoryPage] = React.useState(0)
  const pageSize = 10

  const openReapproModal = (product: Product) => {
    setSelectedProduct(product)
    setAddQuantity("1")
    setIsModalOpen(true)
  }

  const handleReappro = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProduct) return

    const qty = parseInt(addQuantity, 10)
    if (isNaN(qty) || qty <= 0) {
      toast.error("Veuillez entrer une quantité valide")
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch(`${API_BASE}/stock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: selectedProduct.id,
          quantity: qty,
          type: "IN",
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Erreur lors du réapprovisionnement")
      }

      toast.success("Stock mis à jour avec succès")
      setIsModalOpen(false)
      router.refresh() // Refresh server components to get new data
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const filteredMovements = React.useMemo(() => {
    return initialMovements.filter(m => {
      if (movementType !== "all" && m.type !== movementType) return false
      if (movementSearch) {
        const search = movementSearch.toLowerCase()
        if (
          !m.product_name?.toLowerCase().includes(search) &&
          !m.product_reference?.toLowerCase().includes(search) &&
          !m.user_name?.toLowerCase().includes(search)
        ) {
          return false
        }
      }
      return true
    })
  }, [initialMovements, movementType, movementSearch])

  // Reset history page when filters change
  React.useEffect(() => {
    setHistoryPage(0)
  }, [movementType, movementSearch])

  // Pagination logic
  function preventPaginationNavigation(event: React.MouseEvent<HTMLAnchorElement>) {
    event.preventDefault()
  }

  const getPageNumbers = (currentPage: number, pageCount: number) => {
    if (pageCount <= 3) {
      return Array.from({ length: pageCount }, (_, index) => index + 1)
    }
    if (currentPage <= 2) return [1, 2, 3]
    if (currentPage >= pageCount - 1) return [pageCount - 2, pageCount - 1, pageCount]
    return [currentPage - 1, currentPage, currentPage + 1]
  }

  const alertsFilteredCount = initialAlerts.length
  const alertsPageCount = Math.ceil(alertsFilteredCount / pageSize) || 1
  const paginatedAlerts = initialAlerts.slice(alertsPage * pageSize, (alertsPage + 1) * pageSize)
  const alertsStartIndex = alertsFilteredCount === 0 ? 0 : alertsPage * pageSize + 1
  const alertsEndIndex = Math.min(alertsStartIndex + pageSize - 1, alertsFilteredCount)
  const alertsPageNumbers = getPageNumbers(alertsPage + 1, alertsPageCount)

  const historyFilteredCount = filteredMovements.length
  const historyPageCount = Math.ceil(historyFilteredCount / pageSize) || 1
  const paginatedMovements = filteredMovements.slice(historyPage * pageSize, (historyPage + 1) * pageSize)
  const historyStartIndex = historyFilteredCount === 0 ? 0 : historyPage * pageSize + 1
  const historyEndIndex = Math.min(historyStartIndex + pageSize - 1, historyFilteredCount)
  const historyPageNumbers = getPageNumbers(historyPage + 1, historyPageCount)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Gestion du Stock</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Surveillez votre inventaire, gérez les alertes et consultez l&apos;historique des mouvements.
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card xl:grid-cols-3 dark:*:data-[slot=card]:bg-card">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>
              <div className="flex size-7 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
                <Package className="size-4" />
              </div>
            </CardTitle>
            <CardDescription>Total Produits</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="font-medium text-3xl tabular-nums leading-none tracking-tight">{initialDashboard.totalProducts}</div>
            </div>
            <p className="text-muted-foreground text-sm">Références uniques</p>
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>
              <div className="flex size-7 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
                <ArrowRightLeft className="size-4" />
              </div>
            </CardTitle>
            <CardDescription>Valeur du Stock</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="font-medium text-3xl tabular-nums leading-none tracking-tight">
                {Number(initialDashboard.stockValue).toLocaleString("fr-FR")} FCFA
              </div>
            </div>
            <p className="text-muted-foreground text-sm">Basé sur le prix d&apos;achat</p>
          </CardContent>
        </Card>
        <Card className={cn("shadow-none", initialDashboard.lowStockCount > 0 ? "bg-red-50/50 dark:bg-red-950/10" : "")}>
          <CardHeader>
            <CardTitle>
              <div className={cn("flex size-7 items-center justify-center rounded-lg border bg-muted text-muted-foreground", initialDashboard.lowStockCount > 0 && "text-red-600 dark:text-red-400")}>
                <AlertTriangle className="size-4" />
              </div>
            </CardTitle>
            <CardDescription className={initialDashboard.lowStockCount > 0 ? "text-red-600/80 dark:text-red-400/80" : ""}>Produits en Alerte</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className={cn("font-medium text-3xl tabular-nums leading-none tracking-tight", initialDashboard.lowStockCount > 0 && "text-red-600 dark:text-red-400")}>
                {initialDashboard.lowStockCount}
              </div>
            </div>
            <p className={cn("text-muted-foreground text-sm", initialDashboard.lowStockCount > 0 && "text-red-600/80 dark:text-red-400/80")}>
              En dessous du seuil minimum
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="alerts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="alerts">
            Alertes Stock Faible
            {initialDashboard.lowStockCount > 0 && (
              <Badge variant="destructive" className="ml-2 px-1.5 py-0.5 text-[10px] leading-none">
                {initialDashboard.lowStockCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history">Historique Mouvements</TabsTrigger>
        </TabsList>

        <TabsContent value="alerts" className="space-y-4">
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle>Produits nécessitant un réapprovisionnement</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 px-0">
              <div className="overflow-x-auto">
                <Table className="**:data-[slot='table-cell']:px-6 **:data-[slot='table-head']:px-6 **:data-[slot='table-cell']:py-4">
                  <TableHeader className="border-t **:data-[slot='table-head']:h-11 **:data-[slot='table-head']:font-medium **:data-[slot='table-head']:text-foreground **:data-[slot='table-head']:text-sm bg-muted/20">
                    <TableRow>
                      <TableHead className="w-[80px]">Photo</TableHead>
                      <TableHead>Nom du Produit</TableHead>
                      <TableHead>Référence</TableHead>
                      <TableHead className="text-right">Seuil Min.</TableHead>
                      <TableHead className="text-right">Stock Actuel</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="**:data-[slot='table-row']:border-border/50 **:data-[slot='table-row']:hover:bg-muted/10">
                    {paginatedAlerts.length > 0 ? (
                      paginatedAlerts.map((product) => {
                        const photoUrl = getPhotoUrl(product.photos)
                        return (
                          <TableRow key={product.id}>
                            <TableCell>
                              <div className="h-10 w-10 rounded-md border bg-muted flex items-center justify-center overflow-hidden">
                                {photoUrl ? (
                                  <img src={photoUrl} alt={product.name} className="h-full w-full object-cover" />
                                ) : (
                                  <ImageIcon className="h-5 w-5 text-muted-foreground/50" />
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">{product.name}</TableCell>
                            <TableCell className="text-muted-foreground text-sm">{product.reference}</TableCell>
                            <TableCell className="text-right text-muted-foreground">{product.min_stock}</TableCell>
                            <TableCell className="text-right">
                              <Badge variant="outline" className="bg-red-500/15 text-red-700 hover:bg-red-500/25 border-transparent dark:text-red-400 font-bold">
                                {product.quantity}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button size="sm" onClick={() => openReapproModal(product)}>
                                <Plus className="mr-2 size-3" />
                                Réapprovisionner
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                          Aucun produit en alerte de stock.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {alertsFilteredCount > pageSize && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 pb-4 pt-2">
                  <p className="text-muted-foreground text-sm">
                    Affichage {alertsStartIndex}-{alertsEndIndex} sur {alertsFilteredCount} produits
                  </p>

                  <Pagination className="mx-0 w-auto justify-end">
                    <PaginationContent className="gap-1.5">
                      <PaginationItem>
                        <PaginationPrevious
                          href="#"
                          className={alertsPage === 0 ? "pointer-events-none opacity-50" : undefined}
                          onClick={(event) => {
                            preventPaginationNavigation(event)
                            setAlertsPage(Math.max(0, alertsPage - 1))
                          }}
                        />
                      </PaginationItem>
                      {alertsPageNumbers[0] > 1 ? (
                        <PaginationItem>
                          <PaginationEllipsis />
                        </PaginationItem>
                      ) : null}
                      {alertsPageNumbers.map((pageNumber) => (
                        <PaginationItem key={`page-${pageNumber}`}>
                          <PaginationLink
                            href="#"
                            isActive={alertsPage === pageNumber - 1}
                            onClick={(event) => {
                              preventPaginationNavigation(event)
                              setAlertsPage(pageNumber - 1)
                            }}
                          >
                            {pageNumber}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                      {alertsPageNumbers[alertsPageNumbers.length - 1] < alertsPageCount ? (
                        <PaginationItem>
                          <PaginationEllipsis />
                        </PaginationItem>
                      ) : null}
                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          className={alertsPage >= alertsPageCount - 1 ? "pointer-events-none opacity-50" : undefined}
                          onClick={(event) => {
                            preventPaginationNavigation(event)
                            setAlertsPage(Math.min(alertsPageCount - 1, alertsPage + 1))
                          }}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card className="shadow-none">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <CardTitle>Derniers mouvements de stock</CardTitle>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:flex-none sm:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher produit..."
                      className="pl-8"
                      value={movementSearch}
                      onChange={(e) => setMovementSearch(e.target.value)}
                    />
                  </div>
                  <Select value={movementType} onValueChange={setMovementType}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les types</SelectItem>
                      <SelectItem value="IN">Entrées</SelectItem>
                      <SelectItem value="OUT">Sorties</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 px-0">
              <div className="overflow-x-auto">
                <Table className="**:data-[slot='table-cell']:px-6 **:data-[slot='table-head']:px-6 **:data-[slot='table-cell']:py-4">
                  <TableHeader className="border-t **:data-[slot='table-head']:h-11 **:data-[slot='table-head']:font-medium **:data-[slot='table-head']:text-foreground **:data-[slot='table-head']:text-sm bg-muted/20">
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Produit</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Quantité</TableHead>
                      <TableHead>Utilisateur</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="**:data-[slot='table-row']:border-border/50 **:data-[slot='table-row']:hover:bg-muted/10">
                    {paginatedMovements.length > 0 ? (
                      paginatedMovements.map((movement) => (
                        <TableRow key={movement.id}>
                          <TableCell className="whitespace-nowrap">
                            {new Date(movement.created_at).toLocaleString('fr-FR', {
                              day: '2-digit', month: '2-digit', year: 'numeric',
                              hour: '2-digit', minute: '2-digit'
                            })}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{movement.product_name}</div>
                            <div className="text-xs text-muted-foreground">{movement.product_reference}</div>
                          </TableCell>
                          <TableCell>
                            {movement.type === "IN" ? (
                              <Badge variant="outline" className="text-emerald-600 border-emerald-600 bg-emerald-50 dark:bg-emerald-950/20">
                                <ArrowDownRight className="mr-1 size-3" /> Entrée
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-red-600 border-red-600 bg-red-50 dark:bg-red-950/20">
                                <ArrowUpRight className="mr-1 size-3" /> Sortie
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {movement.type === "IN" ? "+" : "-"}{movement.quantity}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {movement.user_name || "Système"}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                          Aucun mouvement trouvé.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {historyFilteredCount > pageSize && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 pb-4 pt-2">
                  <p className="text-muted-foreground text-sm">
                    Affichage {historyStartIndex}-{historyEndIndex} sur {historyFilteredCount} mouvements
                  </p>

                  <Pagination className="mx-0 w-auto justify-end">
                    <PaginationContent className="gap-1.5">
                      <PaginationItem>
                        <PaginationPrevious
                          href="#"
                          className={historyPage === 0 ? "pointer-events-none opacity-50" : undefined}
                          onClick={(event) => {
                            preventPaginationNavigation(event)
                            setHistoryPage(Math.max(0, historyPage - 1))
                          }}
                        />
                      </PaginationItem>
                      {historyPageNumbers[0] > 1 ? (
                        <PaginationItem>
                          <PaginationEllipsis />
                        </PaginationItem>
                      ) : null}
                      {historyPageNumbers.map((pageNumber) => (
                        <PaginationItem key={`page-${pageNumber}`}>
                          <PaginationLink
                            href="#"
                            isActive={historyPage === pageNumber - 1}
                            onClick={(event) => {
                              preventPaginationNavigation(event)
                              setHistoryPage(pageNumber - 1)
                            }}
                          >
                            {pageNumber}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                      {historyPageNumbers[historyPageNumbers.length - 1] < historyPageCount ? (
                        <PaginationItem>
                          <PaginationEllipsis />
                        </PaginationItem>
                      ) : null}
                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          className={historyPage >= historyPageCount - 1 ? "pointer-events-none opacity-50" : undefined}
                          onClick={(event) => {
                            preventPaginationNavigation(event)
                            setHistoryPage(Math.min(historyPageCount - 1, historyPage + 1))
                          }}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal Réapprovisionnement */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Réapprovisionner le stock</DialogTitle>
            <DialogDescription>
              Ajouter de la quantité pour <strong>{selectedProduct?.name}</strong> ({selectedProduct?.reference}).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleReappro}>
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/50">
                <div className="text-center flex-1">
                  <div className="text-sm text-muted-foreground mb-1">Stock Actuel</div>
                  <div className="text-2xl font-bold">{selectedProduct?.quantity}</div>
                </div>
                <div className="flex-none px-4">
                  <ArrowRightLeft className="size-5 text-muted-foreground" />
                </div>
                <div className="text-center flex-1">
                  <div className="text-sm text-muted-foreground mb-1">Stock Après</div>
                  <div className="text-2xl font-bold">
                    {selectedProduct ? selectedProduct.quantity + (parseInt(addQuantity) || 0) : 0}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">Quantité à ajouter</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  required
                  value={addQuantity}
                  onChange={(e) => setAddQuantity(e.target.value)}
                  autoFocus
                  className="focus-visible:ring-1 focus-visible:ring-fp focus-visible:border-fp focus-visible:ring-offset-0"
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSubmitting}>Annuler</Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting || parseInt(addQuantity) <= 0 || isNaN(parseInt(addQuantity))}>
                {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                Confirmer l&apos;entrée
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
