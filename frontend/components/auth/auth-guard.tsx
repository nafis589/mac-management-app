"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const isElectron = typeof window !== "undefined" && (window as any).electron;

    const checkAuth = async () => {
      const raw = localStorage.getItem("fc_user");
      const token = localStorage.getItem("fc_token");

      if (!raw || !token) {
        if (pathname !== "/sign-in") router.replace("/sign-in");
        else setIsAuthorized(true);
        return;
      }

      // In Electron, verify the user still exists in DB (guards against DB reset)
      if (isElectron) {
        try {
          const parsed = JSON.parse(raw);
          const result = await (window as any).electron.invoke("users:getById", parsed.id);
          // IPC returns { success: boolean, data?: user }
          if (!result?.success || !result?.data?.id) {
            // Stale session — clear and redirect
            localStorage.removeItem("fc_user");
            localStorage.removeItem("fc_token");
            document.cookie = "fc_authenticated=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
            router.replace("/sign-in");
            return;
          }
        } catch {
          localStorage.removeItem("fc_user");
          localStorage.removeItem("fc_token");
          document.cookie = "fc_authenticated=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
          router.replace("/sign-in");
          return;
        }
      }

      setIsAuthorized(true);
    };

    checkAuth();
  }, [pathname, router]);

  if (!isAuthorized) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
