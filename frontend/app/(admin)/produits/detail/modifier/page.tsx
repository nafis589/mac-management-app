import { Suspense } from "react";
import ModifierProduitPageContent from "./page-content";

export default function ModifierProduitPage() {
  return (
    <Suspense fallback={
      <div className="flex h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-sm text-muted-foreground">Chargement...</p>
        </div>
      </div>
    }>
      <ModifierProduitPageContent />
    </Suspense>
  );
}
