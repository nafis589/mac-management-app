import type { ReactNode } from "react";

import { AppSidebar } from "@/components/admin/sidebar/app-sidebar";
import { SearchDialog } from "@/components/admin/sidebar/search-dialog";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

export default function AdminLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <SidebarProvider
      defaultOpen={true}
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 68)",
        } as React.CSSProperties
      }
    >
      <AppSidebar />
      <SidebarInset className="peer-data-[variant=inset]:border">
        <header className="sticky top-0 z-50 flex h-12 shrink-0 items-center justify-between gap-2 border-b bg-background/50 backdrop-blur-md px-4 lg:px-6 overflow-hidden rounded-t-[inherit]">
          <div className="flex items-center gap-1 lg:gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mx-2 data-[orientation=vertical]:h-4 data-[orientation=vertical]:self-center"
            />
            <SearchDialog />
          </div>
        </header>
        <div className="flex-1 p-4 md:p-6 max-w-screen-2xl mx-auto w-full">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
