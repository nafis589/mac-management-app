import {
  Archive,
  BarChart3,
  Box,
  LayoutDashboard,
  type LucideIcon,
  Package,
  ShoppingCart,
  Truck,
  Users,
} from "lucide-react";

export interface NavSubItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  comingSoon?: boolean;
  newTab?: boolean;
  roles?: string[];
}

export interface NavMainItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  subItems?: NavSubItem[];
  comingSoon?: boolean;
  newTab?: boolean;
  roles?: string[];
}

export interface NavGroup {
  id: number;
  label?: string;
  items: NavMainItem[];
}

export const sidebarItems: NavGroup[] = [
  {
    id: 1,
    label: "Tableau de bord",
    items: [
      {
        title: "Dashboard",
        url: "/",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    id: 2,
    label: "Gestion",
    items: [
      {
        title: "Utilisateurs",
        url: "/utilisateurs",
        icon: Users,
        roles: ["admin"],
      },
      {
        title: "Produits",
        url: "/produits",
        icon: Package,
      },
      {
        title: "Produits Archivés",
        url: "/produits/archives",
        icon: Archive,
        roles: ["admin"],
      },
      {
        title: "Stock",
        url: "/stock",
        icon: Box,
      },
      {
        title: "Ventes",
        url: "/ventes",
        icon: ShoppingCart,
      },
      {
        title: "Livraisons",
        url: "/livraisons",
        icon: Truck,
      },
    ],
  },
  {
    id: 3,
    label: "Analyse",
    items: [
      {
        title: "Rapports",
        url: "/rapports",
        icon: BarChart3,
        subItems: [
          { title: "Journalier", url: "/rapports/journalier" },
          { title: "Mensuel", url: "/rapports/mensuel" },
        ],
      },
    ],
  },
];
