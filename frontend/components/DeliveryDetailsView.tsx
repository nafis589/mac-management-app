"use client";

import * as React from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  User, Phone, MapPin, CalendarDays, Clock, FileText,
  AlertCircle, CheckCircle2, Loader2, Printer, Check, ArrowLeft
} from "lucide-react";
import { toast } from "sonner";


import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
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
  const [confirmModalState, setConfirmModalState] = React.useState<{ isOpen: boolean, action: 'deliver' | 'cancel' | null }>({ isOpen: false, action: null });

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
    } catch { }
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
    const inputAmount = safeNum(paymentAmount);
    const amountToPay = Math.min(inputAmount, amountDue);
    if (!inputAmount || inputAmount <= 0) {
      toast.error('Montant invalide');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await (window as any).electron.invoke('deliveries:addPayment', delivery.id, amountToPay, currentUser.id);
      if (res.success) {
        toast.success('Paiement enregistré');
        setPaymentAmount("");
        onRefresh();
        window.dispatchEvent(new CustomEvent("deliveries-updated"));
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
        window.dispatchEvent(new CustomEvent("deliveries-updated"));
      } else {
        toast.error("Erreur de mise à jour");
      }
    } catch (error: any) {
      toast.error(error.message || "Erreur de mise à jour");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const executeMarkDelivered = () => handleUpdateStatus("DELIVERED");
  const executeCancelDelivery = async () => {
    setIsUpdatingStatus(true);
    try {
      const res = await (window as any).electron.invoke('deliveries:cancel', delivery.id, "Annulation manuelle", currentUser.id);
      if (res.success) {
        toast.success('Livraison annulée');
        onRefresh();
        window.dispatchEvent(new CustomEvent("deliveries-updated"));
      } else {
        toast.error("Erreur lors de l'annulation");
      }
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'annulation");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const markDeliveredClick = () => setConfirmModalState({ isOpen: true, action: 'deliver' });
  const cancelDeliveryClick = () => setConfirmModalState({ isOpen: true, action: 'cancel' });

  const confirmAction = () => {
    if (confirmModalState.action === 'deliver') {
      executeMarkDelivered();
    } else if (confirmModalState.action === 'cancel') {
      executeCancelDelivery();
    }
    setConfirmModalState({ isOpen: false, action: null });
  };

  return (
    <div className="flex flex-col lg:flex-row w-full h-[calc(100vh-140px)] -mt-2">
      {/* Left Column (Main Details & Products) */}
      <div className="flex-1 flex flex-col pr-6 relative">
        {/* Header */}
        <div className="flex justify-between items-start shrink-0 pb-4 border-b border-gray-100">
          <div className="flex items-start gap-3">
            <div>
              <h2 className="text-lg font-bold text-gray-900 leading-none">
                Livraison {delivery.reference || "N/A"}
              </h2>
              <p className="text-sm text-gray-500 mt-2">
                Créée le {safeFormatDate(delivery.created_at, "dd MMM yyyy à HH:mm")}
              </p>
            </div>
          </div>
          <div>
            <Select value={status} onValueChange={handleUpdateStatus} disabled={isUpdatingStatus || delivery.status === 'DELIVERED' || delivery.status === 'CANCELLED'}>
              <SelectTrigger className="w-[140px] h-9 bg-gray-50 border-gray-200 focus:ring-0">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PENDING">En attente</SelectItem>
                <SelectItem value="IN_PROGRESS">En cours</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Product List Header */}
        <div className="flex justify-between text-sm text-gray-500 font-medium pb-2 pt-2 shrink-0">
          <span className="w-1/2">Détails produits</span>
          <span className="w-1/4 text-center">Quantité</span>
          <span className="w-1/4 text-right">Prix</span>
        </div>

        {/* Product List */}
        <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {Array.isArray(delivery.items) && delivery.items.map((item: any) => (
            <div key={item.id} className="flex items-center justify-between group">
              <div className="flex items-center gap-4 w-1/2">
                <div className="w-14 h-14 bg-gray-100 rounded-md overflow-hidden shrink-0 border border-gray-200/50">
                  {item.product_image ? (
                    <img src={resolveImageUrl(item.product_image)} alt={item.product_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                      <FileText className="h-5 w-5" />
                    </div>
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold text-gray-800 text-[15px] leading-tight">{item.product_name || "Produit"}</span>
                  <span className="text-sm text-gray-500 mt-0.5">{item.product_reference || ""}</span>
                </div>
              </div>
              <div className="w-1/4 text-center font-medium text-gray-700">
                {safeNum(item.quantity)}
              </div>
              <div className="w-1/4 text-right font-semibold text-gray-900">
                {(safeNum(item.unit_price || item.price) * safeNum(item.quantity)).toLocaleString("fr-FR")} F
              </div>
            </div>
          ))}
          {!Array.isArray(delivery.items) && (
            <div className="text-sm text-gray-500 italic py-4 text-center">Détails des produits non disponibles</div>
          )}
        </div>

        {/* Sticky Footer for Buttons */}
        <div className="shrink-0 pt-4 mt-auto border-t border-gray-100 flex items-center justify-between gap-4">
          <Button variant="outline" className="text-gray-600 hover:text-gray-900 border-gray-200 shadow-sm" onClick={onClose}>
            Fermer
          </Button>

          <div className="flex gap-3">
            {delivery.status !== 'DELIVERED' && delivery.status !== 'CANCELLED' && (
              <Button variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 shadow-sm" onClick={cancelDeliveryClick} disabled={isUpdatingStatus}>
                Annuler
              </Button>
            )}
            {delivery.status !== 'DELIVERED' && delivery.status !== 'CANCELLED' && (
              <Button
                onClick={markDeliveredClick}
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
      <div className="lg:w-[380px] shrink-0 flex flex-col gap-6 pl-6 border-l border-gray-100 overflow-y-auto">

        {/* Info Client Card */}
        <div>
          <h3 className="font-bold text-lg text-gray-900 mb-4 pb-2 border-b border-gray-100">
            Informations client
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">Nom complet</span>
              <span className="font-medium text-gray-900 text-right">{delivery.customer_name || "N/A"}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">Téléphone</span>
              <span className="font-medium text-gray-900 text-right">{delivery.customer_phone || "N/A"}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">Adresse</span>
              <span className="font-medium text-gray-900 text-right max-w-[200px] truncate" title={delivery.delivery_address}>{delivery.delivery_address || "N/A"}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">Date prévue</span>
              <span className="font-medium text-gray-900 text-right">{safeFormatDate(delivery.delivery_date, "dd MMM yyyy")}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">Créneau</span>
              <span className="font-medium text-gray-900 text-right capitalize">{delivery.delivery_time || "Non précisé"}</span>
            </div>
            {delivery.notes && (
              <div className="pt-2">
                <p className="text-sm italic text-gray-700 bg-amber-50 p-3 rounded-md border border-amber-100/50">{delivery.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Payment Card */}
        <div className="mt-auto pt-4">
          <h3 className="font-bold text-lg text-gray-900 mb-4 pb-2 border-b border-gray-100">
            Paiement
          </h3>

          <div className="space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">Total commande</span>
              <span className="font-medium text-gray-900">{totalAmt.toLocaleString("fr-FR")} F</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">Déjà payé</span>
              <span className="font-medium">{paidAmt.toLocaleString("fr-FR")} F</span>
            </div>
            <div className="border-t border-gray-100 pt-3 flex justify-between items-center text-base font-bold">
              <span className="text-gray-900">Reste dû</span>
              <span className={amountDue > 0 ? 'text-red-600' : 'text-emerald-600'}>
                {amountDue.toLocaleString("fr-FR")} F
              </span>
            </div>
          </div>

          {delivery.status !== 'CANCELLED' && amountDue > 0 && (
            <div className="mt-5 pt-5 border-t border-gray-100">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Encaisser (tout ou partie)
              </label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value === "" ? "" : safeNum(e.target.value))}
                  className="bg-white focus-visible:ring-0 focus-visible:border-gray-900 focus-visible:border"
                />
                <Button
                  onClick={handleAddPayment}
                  disabled={isSubmitting || !paymentAmount}
                  className="bg-gray-900 hover:bg-gray-800 text-white shrink-0"
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Encaisser"}
                </Button>
              </div>
              {safeNum(paymentAmount) > amountDue && (
                <p className="mt-2 text-sm text-black font-medium">
                  Remets au client: {(safeNum(paymentAmount) - amountDue).toLocaleString("fr-FR")} F
                </p>
              )}
            </div>
          )}
        </div>

      </div>

      {/* Confirmation Modal */}
      <AlertDialog open={confirmModalState.isOpen} onOpenChange={(v) => setConfirmModalState(s => ({ ...s, isOpen: v }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmModalState.action === 'deliver' ? "Confirmer la livraison" : "Annuler la livraison"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmModalState.action === 'deliver'
                ? "Êtes-vous sûr de vouloir marquer cette livraison comme livrée ? Cette action est définitive."
                : "Êtes-vous sûr de vouloir annuler cette livraison ? Cette action est définitive et ne peut pas être annulée."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Retour</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmAction}
              className={confirmModalState.action === 'cancel' ? "bg-red-600 hover:bg-red-700 text-white" : "bg-gray-900 hover:bg-gray-800 text-white"}
            >
              {confirmModalState.action === 'deliver' ? "Oui, marquer livrée" : "Oui, annuler"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
