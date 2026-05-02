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
      },
      {
        title: "Produits",
        url: "/produits",
        icon: Package,
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
        comingSoon: true,
        subItems: [
          { title: "Journalier", url: "/rapports/journalier", comingSoon: true },
          { title: "Mensuel", url: "/rapports/mensuel", comingSoon: true },
        ],
      },
    ],
  },
];
