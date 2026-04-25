"use client";

import * as React from "react";
import {
  type ColumnDef,
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type PaginationState,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Edit,
  KeyRound,
  Loader2,
  Plus,
  Power,
  Search,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  UserRound,
  UsersRound,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// ─── Types ───────────────────────────────────────────────────────────────────
interface User {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  role: "ADMIN" | "CASHIER";
  status: "ACTIVE" | "INACTIVE";
  created_at: string;
}

// ─── Zod Schemas ─────────────────────────────────────────────────────────────
const createUserSchema = z.object({
  first_name: z.string().min(2, "Le prénom doit contenir au moins 2 caractères"),
  last_name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  username: z.string().min(3, "Le nom d'utilisateur doit contenir au moins 3 caractères"),
  password: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères")
    .regex(/[A-Z]/, "Le mot de passe doit contenir au moins 1 majuscule")
    .regex(/\d/, "Le mot de passe doit contenir au moins 1 chiffre"),
  role: z.enum(["ADMIN", "CASHIER"]),
});

const updateUserSchema = z.object({
  first_name: z.string().min(2, "Le prénom doit contenir au moins 2 caractères"),
  last_name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  role: z.enum(["ADMIN", "CASHIER"]),
});

const resetPasswordSchema = z.object({
  newPassword: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères")
    .regex(/[A-Z]/, "Le mot de passe doit contenir au moins 1 majuscule")
    .regex(/\d/, "Le mot de passe doit contenir au moins 1 chiffre"),
});

type CreateUserFormValues = z.infer<typeof createUserSchema>;
type UpdateUserFormValues = z.infer<typeof updateUserSchema>;
type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

const API_BASE = "http://localhost:4000/api";

// ─── API Helpers ─────────────────────────────────────────────────────────────
async function fetchUsers(): Promise<User[]> {
  const response = await fetch(`${API_BASE}/users`);
  if (!response.ok) throw new Error("Erreur lors du chargement des utilisateurs");
  const data = await response.json();
  return data.data;
}

async function createUser(userData: CreateUserFormValues): Promise<User> {
  const response = await fetch(`${API_BASE}/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(userData),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Erreur lors de la création");
  return data.data;
}

async function updateUser(id: number, userData: UpdateUserFormValues): Promise<User> {
  const response = await fetch(`${API_BASE}/users/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(userData),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Erreur lors de la modification");
  return data.data;
}

async function toggleUserStatus(id: number): Promise<{ success: boolean; status: string }> {
  const response = await fetch(`${API_BASE}/users/${id}/toggle-status`, {
    method: "PATCH",
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Erreur lors du changement de statut");
  return data;
}

async function resetUserPassword(
  userId: number,
  newPassword: string
): Promise<void> {
  const response = await fetch(`${API_BASE}/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, newPassword }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Erreur lors du reset du mot de passe");
}

// ─── Columns Definition ─────────────────────────────────────────────────────
function useUsersColumns(
  onEdit: (user: User) => void,
  onToggleStatus: (user: User) => void,
  onResetPassword: (user: User) => void
): ColumnDef<User>[] {
  return React.useMemo(
    () => [
      {
        accessorKey: "last_name",
        header: "Nom",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-md border bg-muted">
              <UserRound className="size-4 text-muted-foreground" />
            </span>
            <span className="truncate font-medium text-sm">{row.original.last_name}</span>
          </div>
        ),
        enableHiding: false,
      },
      {
        accessorKey: "first_name",
        header: "Prénom",
        cell: ({ row }) => (
          <span className="text-sm">{row.original.first_name}</span>
        ),
      },
      {
        accessorKey: "username",
        header: "Username",
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm">@{row.original.username}</span>
        ),
      },
      {
        accessorKey: "role",
        header: "Rôle",
        filterFn: "equalsString",
        cell: ({ row }) => (
          <Badge variant="outline" className="px-1.5 text-muted-foreground">
            <ShieldCheck className="size-3" />
            {row.original.role === "ADMIN" ? "Admin" : "Caissier"}
          </Badge>
        ),
      },
      {
        accessorKey: "status",
        header: "Statut",
        filterFn: "equalsString",
        cell: ({ row }) => {
          const isActive = row.original.status === "ACTIVE";
          return (
            <Badge
              variant={isActive ? "default" : "secondary"}
              className={
                isActive
                  ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/20 dark:text-emerald-400"
                  : "bg-red-500/15 text-red-700 border-red-500/20 dark:text-red-400"
              }
            >
              <span
                className={`mr-1 inline-block size-1.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-red-500"
                  }`}
              />
              {isActive ? "Actif" : "Inactif"}
            </Badge>
          );
        },
      },
      {
        id: "search",
        accessorFn: (row) =>
          `${row.id} ${row.first_name} ${row.last_name} ${row.username}`,
        filterFn: "includesString",
        enableHiding: true,
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => onEdit(row.original)}
              aria-label={`Modifier ${row.original.first_name}`}
            >
              <Edit className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => onToggleStatus(row.original)}
              aria-label={`Basculer le statut de ${row.original.first_name}`}
            >
              <Power className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => onResetPassword(row.original)}
              aria-label={`Reset le mot de passe de ${row.original.first_name}`}
            >
              <KeyRound className="size-4" />
            </Button>
          </div>
        ),
      },
    ],
    [onEdit, onToggleStatus, onResetPassword]
  );
}

// ─── Loading Skeleton ────────────────────────────────────────────────────────
function UsersTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-80" />
        <Skeleton className="h-9 w-40" />
      </div>
      <div className="overflow-hidden rounded-lg border bg-card">
        <div className="space-y-0">
          <div className="flex items-center gap-4 border-b bg-muted/15 p-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={`head-${i}`} className="h-4 flex-1" />
            ))}
          </div>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={`row-${i}`} className="flex items-center gap-4 border-b p-3">
              {Array.from({ length: 6 }).map((_, j) => (
                <Skeleton key={`cell-${i}-${j}`} className="h-4 flex-1" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Create User Dialog ──────────────────────────────────────────────────────
function CreateUserDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<CreateUserFormValues>({
    defaultValues: {
      first_name: "",
      last_name: "",
      username: "",
      password: "",
      role: undefined,
    },
  });

  const onSubmit = async (values: CreateUserFormValues) => {
    // Client-side Zod validation
    const result = createUserSchema.safeParse(values);
    if (!result.success) {
      for (const issue of result.error.issues) {
        form.setError(issue.path[0] as keyof CreateUserFormValues, {
          message: issue.message,
        });
      }
      return;
    }

    setIsSubmitting(true);
    try {
      await createUser(result.data);
      toast.success("Utilisateur créé avec succès");
      form.reset();
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la création");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nouvel utilisateur</DialogTitle>
          <DialogDescription>
            Remplissez les informations pour créer un nouvel utilisateur.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="first_name"
                rules={{
                  required: "Le prénom est requis",
                  minLength: { value: 2, message: "Minimum 2 caractères" },
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prénom</FormLabel>
                    <FormControl>
                      <Input placeholder="Jean" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="last_name"
                rules={{
                  required: "Le nom est requis",
                  minLength: { value: 2, message: "Minimum 2 caractères" },
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom</FormLabel>
                    <FormControl>
                      <Input placeholder="Dupont" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="username"
              rules={{
                required: "Le nom d'utilisateur est requis",
                minLength: { value: 3, message: "Minimum 3 caractères" },
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom d&apos;utilisateur</FormLabel>
                  <FormControl>
                    <Input placeholder="jean.dupont" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              rules={{
                required: "Le mot de passe est requis",
                minLength: { value: 8, message: "Minimum 8 caractères" },
                validate: (value) => {
                  if (!/[A-Z]/.test(value)) return "Au moins 1 majuscule requise";
                  if (!/\d/.test(value)) return "Au moins 1 chiffre requis";
                  return true;
                },
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mot de passe</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              rules={{ required: "Le rôle est requis" }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rôle</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Sélectionner un rôle" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="ADMIN">Administrateur</SelectItem>
                        <SelectItem value="CASHIER">Caissier</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Annuler
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                Créer
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit User Dialog ────────────────────────────────────────────────────────
function EditUserDialog({
  open,
  onOpenChange,
  user,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  onSuccess: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<UpdateUserFormValues>({
    defaultValues: {
      first_name: "",
      last_name: "",
      role: undefined,
    },
  });

  // Pre-fill form when user changes
  React.useEffect(() => {
    if (user) {
      form.reset({
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
      });
    }
  }, [user, form]);

  const onSubmit = async (values: UpdateUserFormValues) => {
    if (!user) return;

    const result = updateUserSchema.safeParse(values);
    if (!result.success) {
      for (const issue of result.error.issues) {
        form.setError(issue.path[0] as keyof UpdateUserFormValues, {
          message: issue.message,
        });
      }
      return;
    }

    setIsSubmitting(true);
    try {
      await updateUser(user.id, result.data);
      toast.success("Utilisateur modifié avec succès");
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la modification");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Modifier l&apos;utilisateur</DialogTitle>
          <DialogDescription>
            Modifiez les informations de {user?.first_name} {user?.last_name}.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="first_name"
                rules={{
                  required: "Le prénom est requis",
                  minLength: { value: 2, message: "Minimum 2 caractères" },
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prénom</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="last_name"
                rules={{
                  required: "Le nom est requis",
                  minLength: { value: 2, message: "Minimum 2 caractères" },
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="role"
              rules={{ required: "Le rôle est requis" }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rôle</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Sélectionner un rôle" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="ADMIN">Administrateur</SelectItem>
                        <SelectItem value="CASHIER">Caissier</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Annuler
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                Enregistrer
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Reset Password Dialog ───────────────────────────────────────────────────
function ResetPasswordDialog({
  open,
  onOpenChange,
  user,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
}) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<ResetPasswordFormValues>({
    defaultValues: { newPassword: "" },
  });

  React.useEffect(() => {
    if (open) {
      form.reset({ newPassword: "" });
    }
  }, [open, form]);

  const onSubmit = async (values: ResetPasswordFormValues) => {
    if (!user) return;

    const result = resetPasswordSchema.safeParse(values);
    if (!result.success) {
      for (const issue of result.error.issues) {
        form.setError(issue.path[0] as keyof ResetPasswordFormValues, {
          message: issue.message,
        });
      }
      return;
    }

    setIsSubmitting(true);
    try {
      await resetUserPassword(user.id, result.data.newPassword);
      toast.success("Mot de passe réinitialisé avec succès");
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Erreur lors du reset");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Réinitialiser le mot de passe</DialogTitle>
          <DialogDescription>
            Définissez un nouveau mot de passe pour{" "}
            <strong>
              {user?.first_name} {user?.last_name}
            </strong>
            .
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="newPassword"
              rules={{
                required: "Le mot de passe est requis",
                minLength: { value: 8, message: "Minimum 8 caractères" },
                validate: (value) => {
                  if (!/[A-Z]/.test(value)) return "Au moins 1 majuscule requise";
                  if (!/\d/.test(value)) return "Au moins 1 chiffre requis";
                  return true;
                },
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nouveau mot de passe</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Annuler
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                Réinitialiser
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Toggle Status Confirmation Dialog ───────────────────────────────────────
function ToggleStatusDialog({
  open,
  onOpenChange,
  user,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  onSuccess: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleConfirm = async () => {
    if (!user) return;

    setIsSubmitting(true);
    try {
      const result = await toggleUserStatus(user.id);
      toast.success(
        `Utilisateur ${result.status === "ACTIVE" ? "activé" : "désactivé"} avec succès`
      );
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors du changement de statut");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isActive = user?.status === "ACTIVE";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isActive ? "Désactiver" : "Activer"} l&apos;utilisateur ?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Êtes-vous sûr de vouloir {isActive ? "désactiver" : "activer"}{" "}
            <strong>
              {user?.first_name} {user?.last_name}
            </strong>{" "}
            ?
            {isActive &&
              " L'utilisateur ne pourra plus se connecter tant qu'il sera inactif."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
            {isActive ? "Désactiver" : "Activer"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─── Users Table (adapted from default-V1 recent-customers-table) ────────────
const statusOptions = [
  { value: "all", label: "Tous" },
  { value: "ACTIVE", label: "Actifs" },
  { value: "INACTIVE", label: "Inactifs" },
] as const;

const roleOptions = [
  { value: "all", label: "Tous" },
  { value: "ADMIN", label: "Admin" },
  { value: "CASHIER", label: "Caissier" },
] as const;

const sortOptions = [
  { value: "newest", label: "Plus récent" },
  { value: "oldest", label: "Plus ancien" },
  { value: "name-asc", label: "Nom A-Z" },
  { value: "name-desc", label: "Nom Z-A" },
] as const;

function UsersTable({
  data,
  onEdit,
  onToggleStatus,
  onResetPassword,
}: {
  data: User[];
  onEdit: (user: User) => void;
  onToggleStatus: (user: User) => void;
  onResetPassword: (user: User) => void;
}) {
  const columns = useUsersColumns(onEdit, onToggleStatus, onResetPassword);

  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "last_name", desc: false },
  ]);
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const table = useReactTable({
    data,
    columns,
    state: {
      columnFilters,
      sorting,
      pagination,
      columnVisibility: { search: false },
    },
    getRowId: (row) => String(row.id),
    onColumnFiltersChange: setColumnFilters,
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const searchQuery =
    (table.getColumn("search")?.getFilterValue() as string) ?? "";
  const statusFilter =
    (table.getColumn("status")?.getFilterValue() as string) ?? "all";
  const roleFilter =
    (table.getColumn("role")?.getFilterValue() as string) ?? "all";

  const sortValue = React.useMemo(() => {
    const currentSort = sorting[0];
    if (!currentSort) return "newest";
    if (currentSort.id === "last_name" && !currentSort.desc) return "name-asc";
    if (currentSort.id === "last_name" && currentSort.desc) return "name-desc";
    if (currentSort.id === "created_at" && currentSort.desc) return "newest";
    if (currentSort.id === "created_at" && !currentSort.desc) return "oldest";
    return "name-asc";
  }, [sorting]);

  return (
    <div className="space-y-4">
      {/* Filters toolbar - exact same pattern as default-V1 */}
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full lg:w-80">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-7 rounded-[min(var(--radius-md),12px)] pl-8"
              placeholder="Rechercher un utilisateur..."
              value={searchQuery}
              onChange={(event) => {
                table
                  .getColumn("search")
                  ?.setFilterValue(event.target.value || undefined);
                table.setPageIndex(0);
              }}
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <UsersRound />
                Statut
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-35" align="start">
              <DropdownMenuRadioGroup
                value={statusFilter}
                onValueChange={(value) => {
                  table
                    .getColumn("status")
                    ?.setFilterValue(value === "all" ? undefined : value);
                  table.setPageIndex(0);
                }}
              >
                {statusOptions.map((status) => (
                  <DropdownMenuRadioItem key={status.value} value={status.value}>
                    {status.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <ShieldCheck />
                Rôle
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-35" align="start">
              <DropdownMenuRadioGroup
                value={roleFilter}
                onValueChange={(value) => {
                  table
                    .getColumn("role")
                    ?.setFilterValue(value === "all" ? undefined : value);
                  table.setPageIndex(0);
                }}
              >
                {roleOptions.map((role) => (
                  <DropdownMenuRadioItem key={role.value} value={role.value}>
                    {role.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center xl:w-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <ArrowUpDown />
                Trier
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuRadioGroup
                value={sortValue}
                onValueChange={(value) => {
                  const nextSorting: SortingState =
                    value === "oldest"
                      ? [{ id: "created_at", desc: false }]
                      : value === "name-asc"
                        ? [{ id: "last_name", desc: false }]
                        : value === "name-desc"
                          ? [{ id: "last_name", desc: true }]
                          : [{ id: "created_at", desc: true }];
                  table.setSorting(nextSorting);
                  table.setPageIndex(0);
                }}
              >
                {sortOptions.map((option) => (
                  <DropdownMenuRadioItem key={option.value} value={option.value}>
                    {option.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Table - exact same pattern as default-V1 */}
      <div className="overflow-hidden rounded-lg border bg-card shadow-none">
        <Table>
          <TableHeader className="bg-muted/15">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    colSpan={header.colSpan}
                    className="h-11 p-3 font-medium"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="p-3 align-middle">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={table.getVisibleLeafColumns().length}
                  className="h-24 text-center"
                >
                  Aucun utilisateur trouvé.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination - exact same pattern as default-V1 */}
      <div className="flex items-center justify-between px-1">
        <div className="hidden flex-1 text-muted-foreground text-sm lg:flex">
          {table.getFilteredRowModel().rows.length} utilisateur(s) au total
        </div>
        <div className="flex w-full items-center gap-8 lg:w-fit">
          <div className="hidden items-center gap-2 lg:flex">
            <Label
              htmlFor="users-rows-per-page"
              className="font-medium text-sm"
            >
              Lignes par page
            </Label>
            <Select
              value={`${table.getState().pagination.pageSize}`}
              onValueChange={(value) => {
                table.setPageSize(Number(value));
              }}
            >
              <SelectTrigger
                size="sm"
                className="w-20"
                id="users-rows-per-page"
              >
                <SelectValue
                  placeholder={table.getState().pagination.pageSize}
                />
              </SelectTrigger>
              <SelectContent side="top">
                <SelectGroup>
                  {[10, 20, 30, 40, 50].map((pageSize) => (
                    <SelectItem key={pageSize} value={`${pageSize}`}>
                      {pageSize}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="flex w-fit items-center justify-center font-medium text-sm">
            Page {table.getState().pagination.pageIndex + 1} sur{" "}
            {table.getPageCount()}
          </div>
          <div className="ml-auto flex items-center gap-2 lg:ml-0">
            <Button
              variant="outline"
              className="hidden size-8 lg:flex"
              size="icon"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Première page</span>
              <ChevronsLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              className="size-8"
              size="icon"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Page précédente</span>
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              className="size-8"
              size="icon"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Page suivante</span>
              <ChevronRight className="size-4" />
            </Button>
            <Button
              variant="outline"
              className="hidden size-8 lg:flex"
              size="icon"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Dernière page</span>
              <ChevronsRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function UtilisateursPage() {
  const [users, setUsers] = React.useState<User[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // Dialog states
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [toggleOpen, setToggleOpen] = React.useState(false);
  const [resetPwdOpen, setResetPwdOpen] = React.useState(false);
  const [selectedUser, setSelectedUser] = React.useState<User | null>(null);

  const loadUsers = React.useCallback(async () => {
    try {
      const data = await fetchUsers();
      setUsers(data);
    } catch (error: any) {
      toast.error(error.message || "Impossible de charger les utilisateurs");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleEdit = React.useCallback((user: User) => {
    setSelectedUser(user);
    setEditOpen(true);
  }, []);

  const handleToggleStatus = React.useCallback((user: User) => {
    setSelectedUser(user);
    setToggleOpen(true);
  }, []);

  const handleResetPassword = React.useCallback((user: User) => {
    setSelectedUser(user);
    setResetPwdOpen(true);
  }, []);

  const handleSuccess = React.useCallback(() => {
    loadUsers();
  }, [loadUsers]);

  // Metrics
  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.status === "ACTIVE").length;
  const adminUsers = users.filter((u) => u.role === "ADMIN").length;
  const cashierUsers = users.filter((u) => u.role === "CASHIER").length;

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Gestion des utilisateurs
          </h1>
          <p className="text-muted-foreground text-sm">
            Gérez les comptes utilisateurs de l&apos;application.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 size-4" />
          Nouvel utilisateur
        </Button>
      </div>

      {/* Metric Cards - Exact layout from dashboard default */}
      <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs xl:grid-cols-4 dark:*:data-[slot=card]:bg-card">
        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex size-7 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
                <UsersRound className="size-4" />
              </div>
            </CardTitle>
            <CardDescription>Total utilisateurs</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            {isLoading ? (
              <Skeleton className="h-9 w-20" />
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <div className="font-medium text-3xl tabular-nums leading-none tracking-tight">{totalUsers}</div>
              </div>
            )}
            <p className="text-muted-foreground text-sm">Comptes sur la plateforme</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex size-7 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
                <Power className="size-4 text-emerald-500" />
              </div>
            </CardTitle>
            <CardDescription>Actifs</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            {isLoading ? (
              <Skeleton className="h-9 w-20" />
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <div className="font-medium text-3xl tabular-nums leading-none tracking-tight text-emerald-600">{activeUsers}</div>
              </div>
            )}
            <p className="text-muted-foreground text-sm">Utilisateurs en activité</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex size-7 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
                <ShieldCheck className="size-4" />
              </div>
            </CardTitle>
            <CardDescription>Administrateurs</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            {isLoading ? (
              <Skeleton className="h-9 w-20" />
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <div className="font-medium text-3xl tabular-nums leading-none tracking-tight">{adminUsers}</div>
              </div>
            )}
            <p className="text-muted-foreground text-sm">Personnel de gestion</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex size-7 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
                <UserRound className="size-4" />
              </div>
            </CardTitle>
            <CardDescription>Caissiers</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            {isLoading ? (
              <Skeleton className="h-9 w-20" />
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <div className="font-medium text-3xl tabular-nums leading-none tracking-tight">{cashierUsers}</div>
              </div>
            )}
            <p className="text-muted-foreground text-sm">Opérateurs de caisse</p>
          </CardContent>
        </Card>
      </div>

      {/* Table Section Wrapped in Card */}
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="leading-none">{totalUsers} Utilisateurs</CardTitle>
          <CardDescription>Enregistrements des utilisateurs avec rôles, statuts et date d'inscription.</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading ? (
            <UsersTableSkeleton />
          ) : (
            <UsersTable
              data={users}
              onEdit={handleEdit}
              onToggleStatus={handleToggleStatus}
              onResetPassword={handleResetPassword}
            />
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <CreateUserDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={handleSuccess}
      />
      <EditUserDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        user={selectedUser}
        onSuccess={handleSuccess}
      />
      <ToggleStatusDialog
        open={toggleOpen}
        onOpenChange={setToggleOpen}
        user={selectedUser}
        onSuccess={handleSuccess}
      />
      <ResetPasswordDialog
        open={resetPwdOpen}
        onOpenChange={setResetPwdOpen}
        user={selectedUser}
      />
    </div>
  );
}
