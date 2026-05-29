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
  budgetExists = false,
}: SetBudgetModalProps) {
  const currentDate = new Date();
  const [month] = useState(currentDate.getMonth() + 1);
  const [year] = useState(currentDate.getFullYear());
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
            <div className="rounded-md border bg-muted/50 px-3 py-2">
              <p className="font-medium capitalize">
                {new Date(year, month - 1).toLocaleString("fr-FR", {
                  month: "long",
                  year: "numeric",
                })}
              </p>
              <p className="text-xs text-muted-foreground">
                Seul le mois en cours est modifiable
              </p>
            </div>
          </div>

          {/* Montant */}
          <div className="space-y-1.5">
            <Label htmlFor="budget-amount">Montant budget (FCFA)</Label>
            <Input
              id="budget-amount"
              type="number"
              placeholder="Ex : 500 000"
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
            disabled={loading || !amount}
            className="bg-fp hover:bg-fp/90 text-white"
          >
            {loading ? "Enregistrement..." : label}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
