"use client";

import { useState, useEffect } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { createBudget } from "@/lib/api";

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

// ─── Validation ───────────────────────────────────────────────────────────────

const budgetSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020).max(2050),
  amount: z
    .number({ error: "Montant invalide" })
    .positive("Le montant doit être positif"),
});

// ─── Types ────────────────────────────────────────────────────────────────────

interface SetBudgetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  defaultMonth: number;
  defaultYear: number;
  budgetExists?: boolean;
}

// ─── Composant ────────────────────────────────────────────────────────────────

export function SetBudgetModal({
  open,
  onOpenChange,
  onSuccess,
  defaultMonth,
  defaultYear,
  budgetExists = false,
}: SetBudgetModalProps) {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  // Mois/année sélectionné dans la page (peut être différent du mois courant)
  const month = defaultMonth ?? currentMonth;
  const year = defaultYear ?? currentYear;
  const isCurrentMonth = month === currentMonth && year === currentYear;

  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const label = budgetExists ? "Modifier le budget" : "Définir le budget";

  useEffect(() => {
    if (open) {
      setAmount("");
      setErrors({});
    }
  }, [open]);

  const handleSubmit = async () => {
    const parsed = budgetSchema.safeParse({
      month,
      year,
      amount: parseFloat(amount),
    });

    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.issues.forEach((e) => {
        if (e.path[0]) errs[String(e.path[0])] = e.message;
      });
      setErrors(errs);
      return;
    }

    setErrors({});
    setLoading(true);
    try {
      // Vérification frontend : uniquement le mois courant est modifiable
      if (!isCurrentMonth) {
        toast.error("Modification impossible : uniquement le mois en cours est modifiable");
        setLoading(false);
        return;
      }
      const raw = localStorage.getItem("fc_user");
      const user = raw ? JSON.parse(raw) : {};
      await createBudget(parsed.data.month, parsed.data.year, parsed.data.amount, user.id);
      toast.success("Budget défini avec succès !");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la création du budget");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{label} mensuel</DialogTitle>
          <DialogDescription>
            Définissez le montant budgété pour le mois en cours.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Période — lecture seule */}
          <div className="space-y-1.5">
            <Label>Période</Label>
            <div className={`rounded-md border px-3 py-2 ${isCurrentMonth ? "bg-muted/50" : "bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800"}`}>
              <p className="font-medium capitalize">
                {new Date(year, month - 1).toLocaleString("fr-FR", {
                  month: "long",
                  year: "numeric",
                })}
              </p>
              <p className={`text-xs ${isCurrentMonth ? "text-muted-foreground" : "text-orange-700 dark:text-orange-300 font-medium"}`}>
                {isCurrentMonth
                  ? "Seul le mois en cours est modifiable"
                  : "⚠ Ce mois n'est pas le mois en cours: la modification sera refusée"}
              </p>
            </div>
          </div>

          {/* Montant */}
          <div className="space-y-1.5">
            <Label htmlFor="budget-amount">Montant budget (FCFA)</Label>
            <Input
              id="budget-amount"
              type="number"
              placeholder="Budget du mois en cours"
              value={amount}
              min={0}
              step={1000}
              onChange={(e) => {
                setAmount(e.target.value);
                if (errors.amount) setErrors((prev) => ({ ...prev, amount: "" }));
              }}
              className={
                errors.amount
                  ? "border-destructive focus-visible:ring-destructive"
                  : "focus-visible:ring-1 focus-visible:ring-fp focus-visible:border-fp focus-visible:ring-offset-0"
              }
              onKeyDown={(e) => {
                if (e.key === "Enter" && !loading) handleSubmit();
              }}
            />
            {errors.amount && (
              <p className="text-xs text-destructive">{errors.amount}</p>
            )}
          </div>
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
            disabled={loading || !amount || !isCurrentMonth}
            className="bg-fp hover:bg-fp/90 text-white"
          >
            {loading ? "Enregistrement..." : label}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
