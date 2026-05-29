"use client";

import { useState, useEffect } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { AlertTriangle, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { addExpense, updateExpense } from "@/lib/api";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ExpenseEditData {
  id: number;
  date: string;
  description: string;
  amount: number;
  source: string;
}

interface AddExpenseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  /** ID du budget du mois (null si aucun budget défini) */
  budgetId: number | null;
  /** Solde restant dans le budget (pour le warning) */
  remaining: number;
  /** Si fourni, le modal fonctionne en mode édition */
  editExpense?: ExpenseEditData | null;
}

// ─── Validation ───────────────────────────────────────────────────────────────

function makeSchema(isOverBudget: boolean) {
  return z
    .object({
      date: z.string().min(1, "Date requise"),
      description: z.string().min(2, "Minimum 2 caractères"),
      amount: z
        .number({ error: "Montant invalide" })
        .positive("Le montant doit être positif"),
      source: z.string().optional(),
    })
    .refine(
      (data) => {
        if (isOverBudget && !data.source?.trim()) return false;
        return true;
      },
      { message: "Source requise si dépassement budget", path: ["source"] }
    );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayIso(): string {
  return new Date().toISOString().split("T")[0];
}

function formatFCFA(n: number): string {
  return `${n.toLocaleString("fr-FR")} FCFA`;
}

// ─── Composant ────────────────────────────────────────────────────────────────

export function AddExpenseModal({
  open,
  onOpenChange,
  onSuccess,
  budgetId,
  remaining,
  editExpense = null,
}: AddExpenseModalProps) {
  const isEditMode = editExpense != null;

  const [date, setDate] = useState(todayIso());
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [customSource, setCustomSource] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Pré-remplir le formulaire quand editExpense change ou que le modal s'ouvre
  useEffect(() => {
    if (open) {
      if (isEditMode && editExpense) {
        setDate(editExpense.date ?? todayIso());
        setDescription(editExpense.description ?? "");
        setAmount(String(editExpense.amount ?? ""));
        // Si la source n'est pas 'BUDGET', c'est une source libre
        setCustomSource(editExpense.source !== "BUDGET" ? (editExpense.source ?? "") : "");
      } else {
        setDate(todayIso());
        setDescription("");
        setAmount("");
        setCustomSource("");
      }
      setErrors({});
    }
  }, [open, editExpense, isEditMode]);

  const amountNum = parseFloat(amount) || 0;

  // En mode édition, le solde disponible inclut le montant original de la dépense
  const effectiveRemaining = isEditMode
    ? remaining + (editExpense?.amount ?? 0)
    : remaining;

  const isOverBudget =
    budgetId !== null && amountNum > 0 && amountNum > effectiveRemaining;

  const inputClass = (field: string) =>
    errors[field]
      ? "border-destructive focus-visible:ring-destructive"
      : "focus-visible:ring-1 focus-visible:ring-fp focus-visible:border-fp focus-visible:ring-offset-0";

  // Convertit la string ISO en objet Date (sans décalage TZ)
  const selectedDate: Date | undefined = date
    ? new Date(date + "T00:00:00")
    : undefined;

  const handleDateSelect = (d: Date | undefined) => {
    if (d) {
      setDate(format(d, "yyyy-MM-dd"));
      if (errors.date) setErrors((p) => ({ ...p, date: "" }));
    }
  };

  const handleSubmit = async () => {
    const schema = makeSchema(isOverBudget);
    const parsed = schema.safeParse({
      date,
      description,
      amount: parseFloat(amount),
      source: customSource,
    });

    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.issues.forEach((e) => {
        if (e.path[0]) errs[String(e.path[0])] = e.message;
      });
      setErrors(errs);
      return;
    }

    const resolvedSource = isOverBudget ? customSource.trim() : "BUDGET";

    setErrors({});
    setLoading(true);
    try {
      const raw = localStorage.getItem("fc_user");
      const user = raw ? JSON.parse(raw) : {};

      if (isEditMode && editExpense) {
        await updateExpense(
          editExpense.id,
          {
            date: parsed.data.date,
            description: parsed.data.description,
            amount: parsed.data.amount,
            source: resolvedSource,
          },
          user.id
        );
        toast.success("Dépense modifiée avec succès !");
      } else {
        await addExpense(
          {
            budget_id: budgetId ?? null,
            date: parsed.data.date,
            description: parsed.data.description,
            amount: parsed.data.amount,
            source: resolvedSource,
          },
          user.id
        );
        toast.success("Dépense ajoutée avec succès !");
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'enregistrement");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Modifier la dépense" : "Ajouter une dépense"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Modifiez les informations de la dépense."
              : "Enregistrez une nouvelle dépense pour ce mois."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* ── Date ─────────────────────────────────────────────────── */}
          <div className="space-y-1.5">
            <Label>Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground",
                    errors.date && "border-destructive"
                  )}
                >
                  <CalendarIcon className="mr-2 size-4 shrink-0" />
                  {selectedDate
                    ? format(selectedDate, "PPP", { locale: fr })
                    : "Choisir une date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  captionLayout="dropdown"
                  locale={fr}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {errors.date && (
              <p className="text-xs text-destructive">{errors.date}</p>
            )}
          </div>

          {/* ── Description ──────────────────────────────────────────── */}
          <div className="space-y-1.5">
            <Label htmlFor="expense-description">Description</Label>
            <Input
              id="expense-description"
              placeholder="Petite description de la dépense"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (errors.description)
                  setErrors((p) => ({ ...p, description: "" }));
              }}
              className={inputClass("description")}
            />
            {errors.description && (
              <p className="text-xs text-destructive">{errors.description}</p>
            )}
          </div>

          {/* ── Montant ───────────────────────────────────────────────── */}
          <div className="space-y-1.5">
            <Label htmlFor="expense-amount">Montant (FCFA)</Label>
            <Input
              id="expense-amount"
              type="number"
              placeholder="Montant de la dépense"
              value={amount}
              min={0}
              step={500}
              onChange={(e) => {
                setAmount(e.target.value);
                if (errors.amount) setErrors((p) => ({ ...p, amount: "" }));
                if (errors.source) setErrors((p) => ({ ...p, source: "" }));
              }}
              className={inputClass("amount")}
            />
            {errors.amount && (
              <p className="text-xs text-destructive">{errors.amount}</p>
            )}
          </div>

          {/* ── Warning + Source libre si dépassement ────────────────── */}
          {isOverBudget && (
            <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 dark:bg-orange-900/20 dark:border-orange-800 space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-orange-600 dark:text-orange-400" />
                <div>
                  <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                    Budget insuffisant (reste : {formatFCFA(effectiveRemaining)})
                  </p>
                  <p className="text-sm text-orange-700 dark:text-orange-300 mt-0.5">
                    Précisez la source de financement :
                  </p>
                </div>
              </div>
              <Input
                placeholder="Ex : Fonds personnels, Prêt banque..."
                value={customSource}
                onChange={(e) => {
                  setCustomSource(e.target.value);
                  if (errors.source) setErrors((p) => ({ ...p, source: "" }));
                }}
                className={
                  errors.source
                    ? "border-destructive focus-visible:ring-destructive"
                    : "border-orange-300 focus-visible:ring-1 focus-visible:ring-orange-400 focus-visible:border-orange-400 focus-visible:ring-offset-0"
                }
              />
              {errors.source && (
                <p className="text-xs text-destructive">{errors.source}</p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="border-fp/20 text-fp hover:bg-fp/10 hover:text-fp"
          >
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !amount}
            className="bg-fp hover:bg-fp/90 text-white"
          >
            {loading
              ? "Enregistrement..."
              : isEditMode
              ? "Enregistrer les modifications"
              : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
