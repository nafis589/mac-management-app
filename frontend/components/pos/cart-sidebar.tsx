"use client"

import * as React from "react"
import { Plus, Minus, X, RotateCcw, ShoppingBag, Tag, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table"
import { usePosStore, getPhotoUrl } from "@/lib/pos-store"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface CartSidebarProps {
  onEncaisser: () => void
}

export function CartSidebar({ onEncaisser }: CartSidebarProps) {
  const router = useRouter()
  const {
    cart,
    discountType,
    discountValue,
    updateQuantity,
    removeFromCart,
    setDiscount,
    clearCart,
  } = usePosStore()

  const subTotal = cart.reduce(
    (acc, item) => acc + Number(item.sale_price) * item.cartQuantity,
    0
  )
  const discountAmount =
    discountType === "PERCENTAGE"
      ? subTotal * (discountValue / 100)
      : discountType === "FIXED"
        ? discountValue
        : 0
  const finalTotal = Math.max(0, subTotal - discountAmount)

  const [showDiscount, setShowDiscount] = React.useState(false)

  /** Affiche "–" si la valeur est 0, sinon formate en FCFA */
  const fmt = (value: number, prefix?: string) => {
    if (value === 0) return "–"
    const formatted = value.toLocaleString("fr-FR")
    return prefix ? `${prefix}${formatted} F cfa` : `${formatted} F cfa`
  }

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between shrink-0">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          Détails commande
          {cart.length > 0 && (
            <Badge variant="secondary" className="h-5 px-1.5 text-xs font-semibold rounded-full">
              {cart.length}
            </Badge>
          )}
        </h2>
        <div className="flex items-center gap-2">
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors px-2 py-1 border border-transparent hover:border-border rounded-md"
            >
              <RotateCcw className="h-3 w-3" />
              Réinitialiser
            </button>
          )}
        </div>
      </div>

      {/* ── Cart Items ─────────────────────────────────────── */}
      <ScrollArea className="flex-1 min-h-0">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 gap-3 text-muted-foreground">
            <ShoppingBag className="h-10 w-10 opacity-30" />
            <p className="text-sm">Panier vide</p>
          </div>
        ) : (
          <div className="ml-2 mt-2 mb-2 mr-4 space-y-2">
            {cart.map((item) => {
              const photoUrl = getPhotoUrl(item.photos)
              return (
                <div
                  key={item.id}
                  className="relative group flex gap-3 items-center border border-border/40 rounded-xl px-1.5 py-1 bg-card hover:border-border transition-colors"
                >
                  {/* Thumbnail */}
                  <div 
                    className="h-16 w-16 rounded-lg bg-muted overflow-hidden shrink-0 border border-border/40 cursor-pointer"
                    onClick={() => router.push(`/produits/detail?id=${item.id}&viewOnly=true`)}
                  >
                    {photoUrl ? (
                      <img
                        src={photoUrl}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Tag className="h-4 w-4 text-muted-foreground/40" />
                      </div>
                    )}
                  </div>

                  {/* Info + Controls */}
                  <div className="flex-1 min-w-0">
                    {/* Name */}
                    <p className="text-sm font-medium text-foreground leading-tight line-clamp-1">
                      {item.name}
                    </p>

                    {/* Variant info */}
                    {(item.color || item.size) && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {[`Couleur: ${item.color}`, `Taille: ${item.size}`]
                          .filter(Boolean)
                          .join(" ")}
                      </p>
                    )}

                    {/* Price + Controls */}
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm font-semibold text-foreground tabular-nums">
                        {Number(item.sale_price).toLocaleString("fr-FR")} F cfa
                      </span>

                      <div className="flex items-center gap-1">
                        {/* Delete */}
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          title="Retirer"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>

                        {/* Decrement */}
                        <button
                          onClick={() =>
                            updateQuantity(item.id, Math.max(1, item.cartQuantity - 1))
                          }
                          className="h-6 w-6 rounded-md border border-border bg-background flex items-center justify-center hover:bg-muted transition-colors"
                        >
                          <Minus className="h-3 w-3" />
                        </button>

                        {/* Qty */}
                        <span className="w-5 text-center text-sm font-medium tabular-nums text-foreground">
                          {item.cartQuantity}
                        </span>

                        {/* Increment */}
                        <button
                          onClick={() => {
                            if (item.cartQuantity < item.quantity) {
                              updateQuantity(item.id, item.cartQuantity + 1)
                            } else {
                              toast.error("Stock maximum atteint")
                            }
                          }}
                          className="h-6 w-6 rounded-md border border-border bg-background flex items-center justify-center hover:bg-muted transition-colors"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>

                </div>
              )
            })}
          </div>
        )}
      </ScrollArea>

      {/* ── Pricing & Actions ──────────────────────────────── */}
      <div className="shrink-0 bg-background px-4 pt-2 pb-1 flex flex-col gap-3">
        {/* Stat Card style for pricing */}
        <Card className="border shadow-none border-border/60 overflow-hidden p-0 rounded-xl">
          <CardContent className="p-0">
            <Table>
              <TableBody>
                {/* Sous-total */}
                <TableRow className="border-0 hover:bg-transparent">
                  <TableCell className="py-2 pl-3 pr-2 text-sm text-muted-foreground font-normal">
                    Sous-total
                  </TableCell>
                  <TableCell className="py-2 pl-2 pr-3 text-sm text-foreground font-medium text-right tabular-nums">
                    {fmt(subTotal)}
                  </TableCell>
                </TableRow>

                {/* Remise */}
                <TableRow className="border-0 hover:bg-transparent">
                  <TableCell className="py-1 pl-3 pr-2 text-sm text-muted-foreground font-normal flex items-center justify-between">
                    <span>Remise</span>
                  </TableCell>
                  <TableCell
                    className={`py-1 pl-2 pr-3 text-sm font-medium text-right tabular-nums ${discountAmount > 0 ? "text-destructive" : "text-muted-foreground"
                      }`}
                  >
                    {discountAmount > 0 ? fmt(discountAmount, "-") : "–"}
                  </TableCell>
                </TableRow>

                {/* Total Payment */}
                <TableRow className="border-t border-border bg-muted">
                  <TableCell className="py-3 pl-3 pr-2 text-sm font-semibold text-foreground">
                    Total à payer
                  </TableCell>
                  <TableCell className="py-3 pl-2 pr-3 text-base font-bold text-foreground text-right tabular-nums">
                    {finalTotal.toLocaleString("fr-FR")} F cfa
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Add Discount & Options */}
        <div className="flex flex-col gap-2">
          <button
            onClick={() => {
              if (showDiscount) {
                setShowDiscount(false)
                setDiscount(null, 0)
              } else {
                setShowDiscount(true)
                setDiscount("PERCENTAGE", 0)
              }
            }}
            className="w-full flex items-center justify-between py-2 px-3 text-sm text-muted-foreground hover:text-foreground border border-border/50 bg-muted/20 rounded-lg hover:border-border transition-colors"
          >
            <span className="font-medium">Ajouter une remise</span>
            <ChevronRight className="h-4 w-4 opacity-60" />
          </button>

          {showDiscount && (
            <div className="flex gap-2 animate-in slide-in-from-top-2 duration-150">
              <Select
                value={discountType || "PERCENTAGE"}
                onValueChange={(val) => setDiscount(val as "PERCENTAGE" | "FIXED", discountValue)}
              >
                <SelectTrigger className="w-[100px] h-9 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERCENTAGE">%</SelectItem>
                  <SelectItem value="FIXED">FCFA</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="number"
                value={discountValue}
                onChange={(e) =>
                  setDiscount(discountType, parseFloat(e.target.value) || 0)
                }
                className="h-9 shadow-none flex-1"
                min="0"
              />
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-1">
          <Button
            variant="outline"
            className="flex-1 h-11 rounded-xl text-sm font-semibold border-border bg-card hover:bg-muted"
            disabled={cart.length === 0}
            onClick={() => toast.info("Commande enregistrée")}
          >
            Attente
          </Button>
          <button
            className="flex-1 h-11 rounded-xl text-sm font-bold text-white transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
            style={{
              background:
                cart.length > 0
                  ? "#dc4818"
                  : "#d1d5db",
            }}
            disabled={cart.length === 0}
            onClick={onEncaisser}
          >
            Encaisser
          </button>
        </div>
      </div>
    </div>
  )
}
