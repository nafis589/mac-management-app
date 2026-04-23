import {
  BarChart3,
  Box,
  LayoutDashboard,
  type LucideIcon,
  Package,
  ShoppingCart,
  Users,
} from "lucide-react";

export interface NavSubItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  comingSoon?: boolean;
  newTab?: boolean;
}

export interface NavMainItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  subItems?: NavSubItem[];
  comingSoon?: boolean;
  newTab?: boolean;
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
        url: "/admin",
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
        url: "/admin/utilisateurs",
        icon: Users,
      },
      {
        title: "Produits",
        url: "/admin/produits",
        icon: Package,
        comingSoon: true,
      },
      {
        title: "Stock",
        url: "/admin/stock",
        icon: Box,
        comingSoon: true,
      },
      {
        title: "Ventes",
        url: "/admin/ventes",
        icon: ShoppingCart,
        comingSoon: true,
      },
    ],
  },
  {
    id: 3,
    label: "Analyse",
    items: [
      {
        title: "Rapports",
        url: "/admin/rapports",
        icon: BarChart3,
        comingSoon: true,
        subItems: [
          { title: "Journalier", url: "/admin/rapports/journalier", comingSoon: true },
          { title: "Mensuel", url: "/admin/rapports/mensuel", comingSoon: true },
        ],
      },
    ],
  },
];
