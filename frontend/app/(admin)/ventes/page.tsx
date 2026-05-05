"use client"

import * as React from "react"
import { Banknote, Loader2, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { usePosStore } from "@/lib/pos-store"
import { ProductGrid } from "@/components/pos/product-grid"
import { CartSidebar } from "@/components/pos/cart-sidebar"
import { generateTicket, TicketSaleData, TicketItemData } from "@/lib/ticket-generator"
import { createSale } from "@/lib/api"

export default function CaissePage() {
  const { cart, discountType, discountValue, clearCart } = usePosStore()

  const [isPaymentOpen, setIsPaymentOpen] = React.useState(false)
  const [isSuccessOpen, setIsSuccessOpen] = React.useState(false)
  const [saleReference, setSaleReference] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const [amountGiven, setAmountGiven] = React.useState<string>("")

  const subTotal = cart.reduce((acc, item) => acc + (Number(item.sale_price) * item.cartQuantity), 0)
  const discountAmount = discountType === 'PERCENTAGE'
    ? subTotal * (discountValue / 100)
    : discountType === 'FIXED' ? discountValue : 0
  const finalTotal = Math.max(0, subTotal - discountAmount)

  const handlePaymentSubmit = async () => {
    if (cart.length === 0) { toast.error("Le panier est vide"); return }

    const given = parseFloat(amountGiven) || 0
    if (given > 0 && given < finalTotal) { toast.error("Montant insuffisant"); return }

    const finalPaymentMethods = { ESPECES: finalTotal }

    try {
      setIsSubmitting(true)

      const userStr = localStorage.getItem("fc_user");
      let cashierId = 1;
      if (userStr) {
        try {
          const userObj = JSON.parse(userStr);
          cashierId = userObj.id || userObj.userId || 1;
        } catch (e) {}
      }

      const saleData = {
        total_amount: subTotal,
        discount_type: discountType,
        discount_value: discountValue,
        final_amount: finalTotal,
        payment_methods: finalPaymentMethods,
        cashier_id: cashierId,
      }
      
      const items = cart.map(item => ({
        productId: item.id,
        quantity: item.cartQuantity,
        unitPrice: Number(item.sale_price)
      }))

      const data = await createSale(saleData, items)
      
      setSaleReference(data.reference)
      setIsPaymentOpen(false)
      setIsSuccessOpen(true)
      if ((window as any).__posRefreshProducts) (window as any).__posRefreshProducts()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleNewSale = () => {
    clearCart()
    setIsSuccessOpen(false)
    setAmountGiven("")
  }

  const handlePrintTicket = () => {
    const saleData: TicketSaleData = {
      reference: saleReference,
      date: new Date(),
      cashierName: "Admin", // TODO: replace with real cashier name
      subTotal: subTotal,
      discountType: discountType as 'PERCENTAGE' | 'FIXED' | null,
      discountValue: discountValue,
      finalAmount: finalTotal,
    }

    const itemsToPrint: TicketItemData[] = cart.map(item => ({
      name: item.name,
      quantity: item.cartQuantity,
      unitPrice: Number(item.sale_price)
    }))

    try {
      const pdfBlob = generateTicket(saleData, itemsToPrint)
      window.open(URL.createObjectURL(pdfBlob))
      toast.success("Ticket généré avec succès")
    } catch (error) {
      console.error(error)
      toast.error("Erreur lors de la génération du ticket")
    }
  }

  return (
    <div className="flex h-[calc(100vh-theme(spacing.16))] -m-6 overflow-hidden rounded-t-lg bg-background">
      {/* LEFT: Products (60%) */}
      <div className="w-3/5 h-full flex flex-col overflow-hidden">
        <ProductGrid />
      </div>

      {/* RIGHT: Cart (40%) */}
      <div className="w-2/5 h-full border-l border-border/50">
        <CartSidebar onEncaisser={() => setIsPaymentOpen(true)} />
      </div>

      {/* Payment Modal */}
      <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-xl">Finaliser l&apos;encaissement</DialogTitle>
            <DialogDescription>Saisissez le montant remis par le client.</DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-between p-4 rounded-xl mb-2 bg-gray-50">
            <span className="font-medium text-gray-700">Montant à régler</span>
            <span className="text-xl font-black text-gray-900">{finalTotal.toLocaleString("fr-FR")} F cfa</span>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-xl space-y-3">
              <Label>Montant remis (Espèces)</Label>
              <Input
                type="number"
                placeholder="Montant donné..."
                className="h-12 text-lg shadow-none bg-white font-medium focus-visible:ring-1 focus-visible:ring-fp focus-visible:border-fp focus-visible:ring-offset-0"
                value={amountGiven}
                onChange={(e) => setAmountGiven(e.target.value)}
              />
              {(parseFloat(amountGiven) || 0) > finalTotal && (
                <div className="flex justify-between p-3 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium">
                  <span>Monnaie à rendre :</span>
                  <span className="font-bold">{(parseFloat(amountGiven) - finalTotal).toLocaleString("fr-FR")} F cfa</span>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="ghost" onClick={() => setIsPaymentOpen(false)} disabled={isSubmitting}>Retour</Button>
            <button
              onClick={handlePaymentSubmit}
              disabled={isSubmitting}
              className="h-10 px-6 rounded-lg text-white font-semibold text-sm disabled:opacity-50 flex items-center gap-2"
              style={{ background: "#FF9066" }}
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {isSubmitting ? "Validation..." : "Valider la vente"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Modal */}
      <Dialog open={isSuccessOpen} onOpenChange={(open) => { if (open) setIsSuccessOpen(true); }}>
        <DialogContent 
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          className="sm:max-w-sm [&>button]:hidden text-center overflow-hidden"
        >
          <DialogTitle className="sr-only">Vente réussie</DialogTitle>
          <div className="absolute inset-0 bg-white -z-10" />
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="h-20 w-20 bg-emerald-100 rounded-full flex items-center justify-center ring-8 ring-emerald-50">
              <CheckCircle2 className="h-10 w-10 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-2xl font-black mb-1 text-emerald-950">Vente réussie !</h2>
              <p className="text-emerald-700 font-medium">Réf: {saleReference}</p>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-col gap-2 w-full">
            <Button className="w-full" size="lg" variant="outline" onClick={() => { handlePrintTicket(); handleNewSale(); }}>
              Imprimer le ticket
            </Button>
            <Button className="w-full" size="lg" onClick={handleNewSale}>Nouvelle vente</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
