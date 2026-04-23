"use client";

import * as React from "react";
import Link from "next/link";

import { Command } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { sidebarItems } from "@/config/admin-navigation";

import { NavMain } from "./nav-main";
import { NavUser } from "./nav-user";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  // Read logged in user from localStorage
  const [currentUser, setCurrentUser] = React.useState<{ name: string; role: string }>({
    name: "Admin",
    role: "admin",
  });

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      if (stored) {
        const parsed = JSON.parse(stored);
        setCurrentUser({
          name: `${parsed.first_name || ""} ${parsed.last_name || ""}`.trim() || parsed.username || "Admin",
          role: parsed.role?.toLowerCase() || "admin",
        });
      }
    } catch {
      // keep defaults
    }
  }, []);

  return (
    <Sidebar variant="inset" collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link prefetch={false} href="/admin">
                <Command />
                <span className="font-semibold text-base">Friperie de Luxe</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={sidebarItems} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={currentUser} />
      </SidebarFooter>
    </Sidebar>
  );
}
