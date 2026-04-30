"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";

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

interface AddBrandModalProps {
  /** Contrôle l'ouverture de la modal */
  open: boolean;
  /** Callback appelé pour ouvrir/fermer la modal */
  onOpenChange: (open: boolean) => void;
  /** Callback appelé après création réussie – reçoit la marque créée */
  onSuccess: (brand: { id: string; name: string }) => void;
}

// ─── Composant ────────────────────────────────────────────────────────────────

export function AddBrandModal({
  open,
  onOpenChange,
  onSuccess,
}: AddBrandModalProps) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  /** Réinitialise le formulaire et ferme la modal */
  const handleClose = () => {
    setName("");
    onOpenChange(false);
  };

  /** Crée la marque via l'API puis notifie le parent */
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
      const response = await fetch("http://localhost:4000/api/brands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Le backend renvoie { success: false, error: "..." }
        toast.error(data.error || "Erreur lors de la création");
        return;
      }

      toast.success("Marque ajoutée avec succès !");
      // Passe la marque créée au formulaire parent
      onSuccess(data.data);
      handleClose();
    } catch (error) {
      toast.error("Impossible de contacter le serveur");
      console.error("[AddBrandModal]", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ajouter une marque</DialogTitle>
          <DialogDescription>
            Entrez le nom de la nouvelle marque (min. 2 caractères)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Input
            placeholder="Ex : Louis Vuitton"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            onKeyDown={(e) => {
              // Soumission rapide avec Entrée
              if (e.key === "Enter" && !loading && name.trim().length >= 2) {
                handleCreate();
              }
            }}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Annuler
          </Button>
          <Button
            onClick={handleCreate}
            disabled={loading || name.trim().length < 2}
          >
            {loading ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Bouton déclencheur (optionnel, réutilisable) ────────────────────────────

interface AddBrandButtonProps {
  onClick: () => void;
}

export function AddBrandButton({ onClick }: AddBrandButtonProps) {
  return (
    <Button
      type="button"
      size="icon"
      variant="outline"
      onClick={onClick}
      className="h-10 w-10 shrink-0 border-gray-300 hover:bg-gray-50"
      title="Ajouter une marque"
    >
      <Plus className="h-4 w-4 text-gray-600" />
    </Button>
  );
}
