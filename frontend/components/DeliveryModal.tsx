"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Truck, User, Phone, MapPin, CalendarDays, Clock, FileText,
  Banknote, AlertCircle, CheckCircle2, Loader2, Search, UserPlus,
} from "lucide-react";

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

// ─── Schéma Zod ──────────────────────────────────────────────────────────────

const deliverySchema = z.object({
  customer_name: z.string().min(2, "Min 2 caractères requis"),
  customer_phone: z.string().min(8, "Numéro invalide"),
  delivery_address: z.string().min(5, "Adresse trop courte"),
  delivery_date: z.string().min(1, "Date requise"),
  delivery_time: z.string().optional(),
  notes: z.string().optional(),
  amount_paid: z.number().min(0, "Montant invalide"),
});

type DeliveryFormValues = z.infer<typeof deliverySchema>;

// ─── Types ───────────────────────────────────────────────────────────────────

interface Customer {
  id: number;
  name: string;
  phone: string;
  address?: string;
}

interface DeliveryModalProps {
  open: boolean;
  totalAmount: number;
  onClose: () => void;
  onConfirm: (data: Omit<DeliveryFormValues, "amount_paid"> & { customer_id?: number }, amountPaid: number) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TODAY = new Date().toISOString().split("T")[0];

const TIME_SLOTS = [
  { value: "matin", label: "Matin — 8h à 12h" },
  { value: "aprem", label: "Après-midi — 14h à 18h" },
  { value: "soir", label: "Soir — 18h à 21h" },
];

const INPUT_CLASS =
  "w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-fp focus:border-fp bg-white placeholder-gray-400 text-sm";

// ─── Composant ───────────────────────────────────────────────────────────────

export function DeliveryModal({
  open,
  totalAmount,
  onClose,
  onConfirm,
}: DeliveryModalProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [step, setStep] = React.useState(0);

  // ── State Step 0 : Sélection client ──────────────────────────────────────
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedCustomer, setSelectedCustomer] = React.useState<Customer | null>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    setValue,
    trigger,
    setError,
    formState: { errors },
  } = useForm<DeliveryFormValues>({
    resolver: zodResolver(deliverySchema) as any,
    defaultValues: {
      customer_name: "",
      customer_phone: "",
      delivery_address: "",
      delivery_date: TODAY,
      delivery_time: "",
      notes: "",
      amount_paid: 0,
    },
  });

  // Charger clients au mount
  React.useEffect(() => {
    if (open) {
      const win = window as any;
      if (win.electron?.invoke) {
        win.electron.invoke("customers:getAll").then((res: any) => {
          const list = res?.data ?? res ?? [];
          setCustomers(Array.isArray(list) ? list : []);
        }).catch(() => setCustomers([]));
      }
    }
  }, [open]);

  // Réinitialise le formulaire à chaque ouverture
  React.useEffect(() => {
    if (open) {
      reset({
        customer_name: "",
        customer_phone: "",
        delivery_address: "",
        delivery_date: TODAY,
        delivery_time: "",
        notes: "",
        amount_paid: 0,
      });
      setIsSubmitting(false);
      setStep(0);
      setSearchQuery("");
      setSelectedCustomer(null);
    }
  }, [open, reset]);

  // Filtrer clients localement
  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone.includes(searchQuery)
  );

  // Quand un client est sélectionné, pré-remplir les champs
  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
  };

  // Lecture en temps réel pour les calculs de paiement
  const amountPaidRaw = watch("amount_paid");
  const amountPaid = Number(amountPaidRaw) || 0;
  const amountDue = Math.max(0, totalAmount - amountPaid);
  const changeAmount = Math.max(0, amountPaid - totalAmount);
  const isFullyPaid = amountPaid >= totalAmount && totalAmount > 0;

  // Passer de Step 0 → Step 1 avec client sélectionné
  const handleNextFromStep0 = () => {
    if (!selectedCustomer) return;
    // Pré-remplir les champs depuis le client sélectionné
    setValue("customer_name", selectedCustomer.name);
    setValue("customer_phone", selectedCustomer.phone);
    setValue("delivery_address", selectedCustomer.address || "");
    setStep(1);
  };

  // Passer en mode "Nouveau client" (Step 1 sans client)
  const handleNewClient = () => {
    setSelectedCustomer(null);
    reset({
      customer_name: "",
      customer_phone: "",
      delivery_address: "",
      delivery_date: TODAY,
      delivery_time: "",
      notes: "",
      amount_paid: 0,
    });
    setStep(1);
  };

  const onSubmit = async (data: DeliveryFormValues) => {
    setIsSubmitting(true);
    try {
      const { amount_paid, ...deliveryData } = data;
      const payload: any = { ...deliveryData };

      // Si client existant sélectionné → on a déjà l'id
      if (selectedCustomer?.id) {
        payload.customer_id = selectedCustomer.id;
      } else {
        // Nouveau client → le créer dans la table delivery_customers
        const win = window as any;
        if (win.electron?.invoke) {
          try {
            const res = await win.electron.invoke(
              'customers:findOrCreate',
              data.customer_name,
              data.customer_phone,
              data.delivery_address
            );
            if (res?.success && res?.data?.id) {
              payload.customer_id = res.data.id;
            }
          } catch (err) {
            console.error('Erreur création client:', err);
          }
        }
      }

      await onConfirm(payload, amount_paid);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Initiales avatar
  const getInitials = (name: string) =>
    name.trim().charAt(0).toUpperCase();

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[540px] max-h-[92vh] overflow-y-auto p-0 gap-0 scrollbar-hidden">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-lg font-semibold text-gray-900">
            Nouvelle Livraison
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-0.5">
            Renseignez les informations de livraison et de paiement
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="px-6 py-5 space-y-6">

            {/* ════════════════════════════════════════════════════════════
                STEP 0 : Sélection client
            ════════════════════════════════════════════════════════════ */}
            {step === 0 && (
              <>
                {/* Barre de recherche + bouton Nouveau client */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Rechercher un client..."
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#dc4818] focus:border-[#dc4818] bg-white placeholder-gray-400 text-sm"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleNewClient}
                    className="shrink-0 border-gray-300 text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 text-sm"
                  >

                    Nouveau client
                  </Button>
                </div>

                {/* Liste des clients */}
                <div
                  className="overflow-y-auto mt-4 [&::-webkit-scrollbar]:hidden"
                  style={{ maxHeight: "300px", scrollbarWidth: "none", msOverflowStyle: "none" }}
                >
                  {filteredCustomers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-gray-400">

                      <p className="text-sm">Aucun client trouvé</p>
                    </div>
                  ) : (
                    filteredCustomers.map((customer) => {
                      const isSelected = selectedCustomer?.id === customer.id;
                      return (
                        <button
                          key={customer.id}
                          type="button"
                          onClick={() => handleSelectCustomer(customer)}
                          className={cn(
                            "w-full text-left flex items-center gap-4 px-2 py-3 transition-colors rounded-lg",
                            isSelected ? "bg-gray-50" : "hover:bg-gray-50"
                          )}
                        >
                          {/* Avatar */}
                          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                            <User className="h-5 w-5 text-gray-400" />
                          </div>
                          
                          {/* Infos */}
                          <div className="flex-1 min-w-0">
                            <p className="text-[15px] font-medium text-gray-900 truncate">
                              {customer.name}
                            </p>
                            <p className="text-[13px] text-gray-500 truncate">
                              {customer.phone}
                            </p>
                          </div>
                          
                          {/* Checkbox */}
                          <div className="shrink-0 pr-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              readOnly
                              className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900 accent-gray-900"
                            />
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </>
            )}

            {/* ════════════════════════════════════════════════════════════
                STEP 1 : Informations livraison
            ════════════════════════════════════════════════════════════ */}
            {step === 1 && (
              <>
                {/* CAS B : client existant sélectionné → header lecture seule */}
                {selectedCustomer && (
                  <div className="flex items-center gap-4 mb-2">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-[15px] font-medium text-gray-900">{selectedCustomer.name}</p>
                      <p className="text-[13px] text-gray-500">{selectedCustomer.phone}</p>
                    </div>
                  </div>
                )}

                {/* CAS A : Nouveau client → section Informations client */}
                {!selectedCustomer && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      Informations client
                    </h3>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Nom */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-gray-600">
                          Nom complet <span className="text-red-500">*</span>
                        </Label>
                        <div className="relative">
                          <input
                            {...register("customer_name")}
                            placeholder="Nom Complet"
                            className={INPUT_CLASS}
                          />
                        </div>
                        {errors.customer_name && (
                          <p className="text-red-500 text-xs flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            {errors.customer_name.message}
                          </p>
                        )}
                      </div>

                      {/* Téléphone */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-gray-600">
                          Téléphone <span className="text-red-500">*</span>
                        </Label>
                        <div className="relative">
                          <input
                            {...register("customer_phone")}
                            placeholder="Numéro de téléphone"
                            className={INPUT_CLASS}
                          />
                        </div>
                        {errors.customer_phone && (
                          <p className="text-red-500 text-xs flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            {errors.customer_phone.message}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Adresse */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-gray-600">
                        Adresse de livraison <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <textarea
                          {...register("delivery_address")}
                          placeholder="Adresse de livraison"
                          rows={2}
                          className={`${INPUT_CLASS} resize-none`}
                        />
                      </div>
                      {errors.delivery_address && (
                        <p className="text-red-500 text-xs flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {errors.delivery_address.message}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* ── Section Planification ─────────────────────────────── */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    Planification
                  </h3>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Date */}
                    <div className="space-y-1.5 flex flex-col">
                      <Label className="text-xs font-medium text-gray-600">
                        Date de livraison <span className="text-red-500">*</span>
                      </Label>
                      <Controller
                        name="delivery_date"
                        control={control}
                        render={({ field }: { field: any }) => (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full justify-start text-left font-normal border-gray-300 focus:ring-1 focus:ring-fp h-9 text-sm",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                <CalendarDays className="mr-2 h-4 w-4" />
                                {field.value ? (
                                  format(new Date(field.value), "PPP", { locale: fr })
                                ) : (
                                  <span>Sélectionnez une date</span>
                                )}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 z-[100]">
                              <Calendar
                                mode="single"
                                selected={field.value ? new Date(field.value) : undefined}
                                onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                                disabled={(date) => {
                                  const today = new Date();
                                  today.setHours(0, 0, 0, 0);
                                  return date < today;
                                }}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        )}
                      />
                      {errors.delivery_date && (
                        <p className="text-red-500 text-xs flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {errors.delivery_date.message}
                        </p>
                      )}
                    </div>

                    {/* Créneau horaire */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-gray-600">
                        Créneau horaire
                      </Label>
                      <Controller
                        name="delivery_time"
                        control={control}
                        render={({ field }: { field: any }) => (
                          <Select
                            value={field.value || ""}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger className="w-full bg-white h-9 rounded-lg border-gray-300 shadow-none text-sm">
                              <div className="flex items-center gap-2">
                                <Clock className="h-3.5 w-3.5 text-gray-400" />
                                <SelectValue placeholder="Choisir un créneau" />
                              </div>
                            </SelectTrigger>
                            <SelectContent>
                              {TIME_SLOTS.map((slot) => (
                                <SelectItem key={slot.value} value={slot.value}>
                                  {slot.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-gray-600 flex items-center gap-1">
                      Notes supplémentaires
                      <span className="text-gray-400 font-normal">(optionnel)</span>
                    </Label>
                    <textarea
                      {...register("notes")}
                      placeholder="Instructions particulières pour le livreur..."
                      rows={2}
                      className={`${INPUT_CLASS} resize-none`}
                    />
                  </div>
                </div>
              </>
            )}

            {/* ════════════════════════════════════════════════════════════
                STEP 2 : Paiement (INCHANGÉ)
            ════════════════════════════════════════════════════════════ */}
            {step === 2 && (
              <>
                {/* ── Section Paiement ────────────────────────────────────────── */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 hidden">
                    Paiement
                  </h3>

                  {/* Récap total */}
                  <div className="flex items-center justify-between">
                    <span className="text-[15px] font-medium text-gray-900">Total commande</span>
                    <span className="text-[15px] text-gray-900">
                      {totalAmount.toLocaleString("fr-FR")} FCFA
                    </span>
                  </div>

                  {/* Montant remis */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-gray-600">
                      Montant remis maintenant
                    </Label>
                    <div className="relative">
                      <input
                        type="number"
                        {...register("amount_paid", { valueAsNumber: true })}
                        min={0}
                        placeholder="0"
                        className={`${INPUT_CLASS} pr-16`}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">
                        FCFA
                      </span>
                    </div>
                    {errors.amount_paid ? (
                      <p className="text-red-500 text-xs flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.amount_paid.message}
                      </p>
                    ) : (
                      <>
                        {/* Alerte reste à payer */}
                        {amountDue > 0 && amountPaid >= 0 && (
                          <p className="text-xs text-amber-600">
                            reste à payer : {amountDue.toLocaleString("fr-FR")} fcfa
                          </p>
                        )}

                        {/* Badge payé intégralement */}
                        {isFullyPaid && (
                          <div className="space-y-1">
                            <p className="text-xs text-emerald-600">
                              commande payée intégralement
                            </p>
                            {changeAmount > 0 && (
                              <p className="text-xs text-emerald-600">
                                monnaie à rendre : {changeAmount.toLocaleString("fr-FR")} fcfa
                              </p>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ── Footer ────────────────────────────────────────────────────── */}
          <DialogFooter className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex gap-2">

            {/* STEP 0 */}
            {step === 0 && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="border-gray-300 text-gray-600 hover:bg-gray-50"
                >
                  Annuler
                </Button>
                <Button
                  type="button"
                  disabled={!selectedCustomer}
                  onClick={handleNextFromStep0}
                  className="flex-1 h-10 px-6 rounded-lg text-white font-semibold text-sm transition-all active:scale-[0.98] disabled:opacity-50"
                  style={{ background: "#dc4818" }}
                >
                  Suivant
                </Button>
              </>
            )}

            {/* STEP 1 */}
            {step === 1 && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(0)}
                  className="border-gray-300 text-gray-600 hover:bg-gray-50"
                >
                  Retour
                </Button>
                <Button
                  type="button"
                  onClick={async () => {
                    // Si nouveau client : valider tous les champs client + date
                    if (!selectedCustomer) {
                      const valid = await trigger(["customer_name", "customer_phone", "delivery_address", "delivery_date"]);
                      if (valid) {
                        const formPhone = watch("customer_phone");
                        // Vérifier localement si ce numéro existe déjà dans la liste
                        const phoneExists = customers.some(c => c.phone === formPhone);
                        if (phoneExists) {
                          setError("customer_phone", {
                            type: "manual",
                            message: "Ce numéro de téléphone existe déjà."
                          });
                          return;
                        }
                        setStep(2);
                      }
                    } else {
                      // Client existant : valider seulement la date
                      const valid = await trigger(["delivery_date"]);
                      if (valid) setStep(2);
                    }
                  }}
                  className="flex-1 h-10 px-6 rounded-lg text-white font-semibold text-sm transition-all active:scale-[0.98]"
                  style={{ background: "#dc4818" }}
                >
                  Suivant
                </Button>
              </>
            )}

            {/* STEP 2 */}
            {step === 2 && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  disabled={isSubmitting}
                  className="border-gray-300 text-gray-600 hover:bg-gray-50"
                >
                  Retour
                </Button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 h-10 px-6 rounded-lg text-white font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                  style={{ background: "#dc4818" }}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    "Enregistrer livraison"
                  )}
                </button>
              </>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
