import { Tag } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-background">
      <div className="grid h-dvh justify-center p-2 lg:grid-cols-2">
        {/* Branding/Marketing Panel (Visible on Desktop) */}
        <div className="relative order-2 hidden h-full rounded-3xl bg-primary lg:flex overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom_right,transparent_0%,rgba(0,0,0,0.1)_100%)]" />

          <div className="relative z-10 flex flex-col justify-between w-full h-full p-12 text-primary-foreground">
            <div className="space-y-4">
              <div className="space-y-2">
                <Tag className="size-10 text-white" />
                <h1 className="font-semibold text-2xl tracking-tight">Friperie de Luxe</h1>
              </div>
              <p className="text-primary-foreground/80 font-medium text-lg">Gérez. Suivez. Vendez vos articles.</p>
            </div>


            <div className="flex w-full justify-between items-end gap-6">
              <div className="flex-1 space-y-1.5">
                <h2 className="font-semibold text-lg">Prêt pour l'action ?</h2>
                <p className="text-sm text-primary-foreground/70 leading-relaxed">
                  Connectez-vous pour accéder à votre inventaire, gérer vos articles et suivre vos performances en temps réel.
                </p>
              </div>
              <Separator orientation="vertical" className="h-12 bg-white/20" />
              <div className="flex-1 space-y-1.5">
                <h2 className="font-semibold text-lg">Besoin d'aide ?</h2>
                <p className="text-sm text-primary-foreground/70 leading-relaxed">
                  Une question ou un problème ? N'hésitez pas à contacter votre administrateur ou le support technique.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Auth Content Panel */}
        <div className="relative order-1 flex h-full items-center justify-center">
          <div className="w-full max-w-md px-6 py-12">
            {children}
          </div>
        </div>
      </div>
    </main>
  );
}

