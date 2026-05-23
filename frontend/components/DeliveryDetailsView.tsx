"use client";

import * as React from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  User, Phone, MapPin, CalendarDays, Clock, FileText,
  AlertCircle, CheckCircle2, Loader2, Printer, Check
} from "lucide-react";
import { toast } from "sonner";


import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { resolveImageUrl } from "@/lib/api";

const DELIVERY_STATUS_MAP: Record<string, string> = {
  PENDING: "En attente",
  IN_PROGRESS: "En cours",
  DELIVERED: "Livrée",
  CANCELLED: "Annulée",
};

interface DeliveryDetailsModalProps {
  open: boolean;
  delivery: any | null;
  onClose: () => void;
  onRefresh: () => void;
}

export function DeliveryDetailsView({
  open,
  delivery,
  onClose,
  onRefresh
}: DeliveryDetailsModalProps) {
  const [paymentAmount, setPaymentAmount] = React.useState<number | "">("");
  const [status, setStatus] = React.useState<string>(delivery?.status || "PENDING");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = React.useState(false);

  React.useEffect(() => {
    if (delivery && open) {
      setPaymentAmount("");
      setStatus(delivery.status);
    }
  }, [delivery, open]);

  const currentUser = React.useMemo(() => {
    try {
      const userStr = localStorage.getItem("fc_user");
      if (userStr) return JSON.parse(userStr);
    } catch {}
    return { id: 1 }; // Fallback
  }, []);

  if (!delivery) return null;

  // --- SAFEGARDS ---
  const safeFormatDate = (dateVal: any, fmt: string) => {
    if (!dateVal) return "N/A";
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return "N/A";
      return format(d, fmt, { locale: fr });
    } catch {
      return "N/A";
    }
  };

  const safeNum = (val: any) => {
    const n = Number(val);
    return isNaN(n) ? 0 : n;
  };

  const totalAmt = safeNum(delivery.total_amount);
  const paidAmt = safeNum(delivery.amount_paid);
  const amountDue = Math.max(0, totalAmt - paidAmt);

  const handleAddPayment = async () => {
    const amount = safeNum(paymentAmount);
    if (!amount || amount <= 0 || amount > amountDue) {
      toast.error('Montant invalide');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await (window as any).electron.invoke('deliveries:addPayment', delivery.id, amount, currentUser.id);
      if (res.success) {
        toast.success('Paiement enregistré');
        setPaymentAmount("");
        onRefresh();
      } else {
        toast.error("Erreur lors de l'enregistrement du paiement");
      }
    } catch (error: any) {
      toast.error(error.message || "Erreur lors du paiement");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    setStatus(newStatus);
    setIsUpdatingStatus(true);
    try {
      const res = await (window as any).electron.invoke('deliveries:updateStatus', delivery.id, newStatus, currentUser.id);
      if (res.success) {
        toast.success('Statut mis à jour');
        onRefresh();
      } else {
        toast.error("Erreur de mise à jour");
      }
    } catch (error: any) {
      toast.error(error.message || "Erreur de mise à jour");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const markDelivered = () => handleUpdateStatus("DELIVERED");
  const cancelDelivery = async () => {
    if (!confirm("Voulez-vous vraiment annuler cette livraison ?")) return;
    setIsUpdatingStatus(true);
    try {
      const res = await (window as any).electron.invoke('deliveries:cancel', delivery.id, "Annulation manuelle", currentUser.id);
      if (res.success) {
        toast.success('Livraison annulée');
        onRefresh();
      } else {
        toast.error("Erreur lors de l'annulation");
      }
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'annulation");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full max-w-6xl mx-auto pb-10">
      {/* Left Column (Main Details & Products) */}
      <div className="flex-1 flex flex-col gap-6 bg-white p-6 rounded-xl border border-gray-200 shadow-sm relative min-h-[600px]">
        {/* Header */}
        <div className="flex justify-between items-start border-b border-gray-100 pb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Livraison {delivery.reference || "N/A"}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Créée le {safeFormatDate(delivery.created_at, "dd MMM yyyy à HH:mm")}
            </p>
          </div>
          <div>
            <Select value={status} onValueChange={handleUpdateStatus} disabled={isUpdatingStatus || delivery.status === 'DELIVERED' || delivery.status === 'CANCELLED'}>
              <SelectTrigger className="w-[140px] h-9 bg-gray-50 border-gray-200 focus:ring-0">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PENDING">En attente</SelectItem>
                <SelectItem value="IN_PROGRESS">En cours</SelectItem>
                <SelectItem value="DELIVERED">Livrée</SelectItem>
                <SelectItem value="CANCELLED">Annulée</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Product List Header */}
        <div className="flex justify-between text-sm text-gray-500 font-medium border-b border-gray-100 pb-2 mt-4">
          <span className="w-1/2">Détails produits</span>
          <span className="w-1/4 text-center">Quantité</span>
          <span className="w-1/4 text-right">Prix</span>
        </div>

        {/* Product List */}
        <div className="flex-1 space-y-4 py-2">
          {Array.isArray(delivery.items) && delivery.items.map((item: any) => (
            <div key={item.id} className="flex items-center justify-between group">
              <div className="flex items-center gap-4 w-1/2">
                <div className="w-16 h-16 bg-gray-100 rounded-md overflow-hidden shrink-0 border border-gray-200/50">
                  {item.product_image ? (
                    <img src={resolveImageUrl(item.product_image)} alt={item.product_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                      <FileText className="h-6 w-6" />
                    </div>
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold text-gray-800 text-base leading-tight">{item.product_name || "Produit"}</span>
                  <span className="text-sm text-gray-500 mt-0.5">{item.product_reference || ""}</span>
                </div>
              </div>
              <div className="w-1/4 text-center font-medium text-gray-700">
                {safeNum(item.quantity)}
              </div>
              <div className="w-1/4 text-right font-semibold text-gray-900">
                {safeNum(item.price).toLocaleString("fr-FR")} F
              </div>
            </div>
          ))}
          {!Array.isArray(delivery.items) && (
            <div className="text-sm text-gray-500 italic py-4 text-center">Détails des produits non disponibles</div>
          )}
        </div>

        {/* Sticky Footer for Buttons */}
        <div className="mt-auto pt-6 border-t border-gray-100 flex items-center justify-between gap-4">
          <Button variant="outline" className="text-gray-600 hover:text-gray-900 border-gray-200 shadow-sm" onClick={onClose}>
            Fermer
          </Button>

          <div className="flex gap-3">
            {delivery.status !== 'DELIVERED' && delivery.status !== 'CANCELLED' && (
              <Button variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 shadow-sm" onClick={cancelDelivery} disabled={isUpdatingStatus}>
                Annuler
              </Button>
            )}
            {delivery.status !== 'DELIVERED' && delivery.status !== 'CANCELLED' && (
              <Button 
                onClick={markDelivered} 
                disabled={isUpdatingStatus}
                className="bg-gray-900 hover:bg-gray-800 text-white shadow-sm"
              >
                <Check className="h-4 w-4 mr-2" /> Marquer livrée
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Right Column (Summary & Payment) */}
      <div className="lg:w-[350px] shrink-0 flex flex-col gap-6">
        
        {/* Info Client Card */}
        <div className="bg-gray-50/50 p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="font-bold text-lg text-gray-900 mb-4 pb-2 border-b border-gray-200">
            Informations client
          </h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500 mb-0.5">Nom complet</p>
              <p className="font-medium text-gray-900">{delivery.customer_name || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-0.5">Téléphone</p>
              <p className="font-medium text-gray-900">{delivery.customer_phone || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-0.5">Adresse de livraison</p>
              <p className="font-medium text-gray-900">{delivery.delivery_address || "N/A"}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 mb-0.5">Date prévue</p>
                <p className="font-medium text-gray-900">{safeFormatDate(delivery.delivery_date, "dd MMM yyyy")}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-0.5">Créneau</p>
                <p className="font-medium text-gray-900 capitalize">{delivery.delivery_time || "Non précisé"}</p>
              </div>
            </div>
            {delivery.notes && (
              <div className="pt-2">
                <p className="text-sm text-gray-500 mb-0.5">Notes</p>
                <p className="text-sm italic text-gray-700 bg-amber-50 p-3 rounded-md border border-amber-100/50">{delivery.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Payment Card */}
        <div className="bg-gray-50/50 p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="font-bold text-lg text-gray-900 mb-4 pb-2 border-b border-gray-200">
            Paiement
          </h3>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">Total commande</span>
              <span className="font-medium text-gray-900">{totalAmt.toLocaleString("fr-FR")} F</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">Déjà payé</span>
              <span className="text-emerald-600 font-medium">{paidAmt.toLocaleString("fr-FR")} F</span>
            </div>
            <div className="border-t border-gray-200/60 pt-3 flex justify-between items-center text-base font-bold">
              <span className="text-gray-900">Reste dû</span>
              <span className={amountDue > 0 ? 'text-red-600' : 'text-emerald-600'}>
                {amountDue.toLocaleString("fr-FR")} F
              </span>
            </div>
          </div>
          
          {amountDue > 0 && (
            <div className="mt-5 pt-5 border-t border-gray-200/60">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Encaisser (tout ou partie)
              </label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(safeNum(e.target.value) || "")}
                  placeholder={`Max ${amountDue.toLocaleString()} F`}
                  max={amountDue}
                  className="bg-white border-gray-300 focus-visible:ring-1 focus-visible:ring-gray-900"
                />
                <Button 
                  onClick={handleAddPayment} 
                  disabled={isSubmitting || !paymentAmount}
                  className="bg-gray-900 hover:bg-gray-800 text-white shrink-0"
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Encaisser"}
                </Button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
