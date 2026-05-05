"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { createCategory } from "@/lib/api";

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

// ─── Types ───────────────────────────────────────────────────────────────────

interface AddCategoryModalProps {
  /** Contrôle l'ouverture de la modal */
  open: boolean;
  /** Callback appelé pour ouvrir/fermer la modal */
  onOpenChange: (open: boolean) => void;
  /** Callback appelé après création réussie – reçoit la catégorie créée */
  onSuccess: (category: { id: string; name: string }) => void;
}

// ─── Composant ────────────────────────────────────────────────────────────────

export function AddCategoryModal({
  open,
  onOpenChange,
  onSuccess,
}: AddCategoryModalProps) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  /** Réinitialise le formulaire et ferme la modal */
  const handleClose = () => {
    setName("");
    onOpenChange(false);
  };

  /** Crée la catégorie via l'API puis notifie le parent */
  const handleCreate = async () => {
    // Validation minimale côté client
    if (!name.trim()) {
      toast.error("Le nom est requis");
      return;
    }
    if (name.trim().length < 2) {
      toast.error("Le nom doit contenir au moins 2 caractères");
      return;
    }

    setLoading(true);
    try {
      const data = await createCategory(name.trim());
      toast.success("Catégorie ajoutée avec succès !");
      onSuccess(data);
      handleClose();
    } catch (error: any) {
      toast.error(error.message || "Impossible de contacter le serveur");
      console.error("[AddCategoryModal]", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ajouter une catégorie</DialogTitle>
          <DialogDescription>
            Entrez le nom de la nouvelle catégorie (min. 2 caractères)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Input
            placeholder="Ex : Vêtements d'hiver"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            className="focus-visible:ring-1 focus-visible:ring-fp focus-visible:border-fp focus-visible:ring-offset-0"
            onKeyDown={(e) => {
              // Soumission rapide avec Entrée
              if (e.key === "Enter" && !loading && name.trim().length >= 2) {
                handleCreate();
              }
            }}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading} className="border-fp/20 text-fp hover:bg-fp/10 hover:text-fp">
            Annuler
          </Button>
          <Button
            onClick={handleCreate}
            disabled={loading || name.trim().length < 2}
            className="bg-fp hover:bg-fp/90 text-white"
          >
            {loading ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Bouton déclencheur (optionnel, réutilisable) ────────────────────────────

interface AddCategoryButtonProps {
  onClick: () => void;
}

export function AddCategoryButton({ onClick }: AddCategoryButtonProps) {
  return (
    <Button
      type="button"
      size="icon"
      variant="outline"
      onClick={onClick}
      className="h-10 w-10 shrink-0 border-gray-300 hover:bg-gray-50"
      title="Ajouter une catégorie"
    >
      <Plus className="h-4 w-4 text-gray-600" />
    </Button>
  );
}
