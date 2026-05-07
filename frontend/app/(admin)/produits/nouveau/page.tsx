"use client";

import React, { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Upload, X, ArrowLeft, PlusCircle } from "lucide-react";
import Link from "next/link";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { AddCategoryModal } from "@/components/AddCategoryModal";
import { AddBrandModal } from "@/components/AddBrandModal";
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
import {
  getCategories,
  getBrands,
  createProduct,
  uploadProductPhotos,
  deleteCategory,
  deleteBrand,
} from "@/lib/api";

const productSchema = z.object({
  name: z.string().min(2, "Min 2 caractères").max(100),
  reference: z.string().optional(),
  barcode: z.string().optional(),
  description: z.string().max(1000).optional(),
  category_id: z.string().min(1, "Catégorie requise"),
  brand_id: z.string().min(1, "Marque requise"),
  size: z.string().optional(),
  color: z.string().optional(),
  condition: z.enum(["EXCELLENT", "VERY_GOOD", "GOOD"]),
  sale_price: z.number().positive("Prix de vente > 0"),
  purchase_price: z.number().positive("Prix d'achat > 0"),
  quantity: z.number().min(0),
  min_stock: z.number().min(0).default(2),
  in_stock: z.boolean().default(true),
  charge_tax: z.boolean().default(false),
}).refine(data => data.sale_price > data.purchase_price, {
  message: "Prix de vente doit être > prix d'achat",
  path: ["sale_price"]
});

type ProductFormValues = z.infer<typeof productSchema>;

export default function NouveauProduitPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  // Listes catégories / marques chargées depuis l'API
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);

  // Contrôle des modaux d'ajout inline
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddBrand, setShowAddBrand] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<
    | { type: "category" | "brand"; id: string | number; name: string }
    | null
  >(null);

  const refreshCategories = async () => {
    const data = await getCategories();
    setCategories(data || []);
    return data || [];
  };

  const refreshBrands = async () => {
    const data = await getBrands();
    setBrands(data || []);
    return data || [];
  };

  useEffect(() => {
    Promise.all([
      refreshCategories().catch(() => undefined),
      refreshBrands().catch(() => undefined)
    ]).then(([catData, brandData]) => {
      if (catData) setCategories(catData as any);
      if (brandData) setBrands(brandData as any);
    }).catch(err => console.error("Erreur chargement filtres", err));
  }, []);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors }
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema) as any,
    defaultValues: {
      name: "",
      category_id: "",
      brand_id: "",
      sale_price: 0,
      purchase_price: 0,
      quantity: 0,
      condition: "EXCELLENT",
      in_stock: true,
      min_stock: 2,
      charge_tax: false
    }
  });

  const inStock = watch("in_stock");
  const chargeTax = watch("charge_tax");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (photos.length + files.length > 5) {
      toast.error("Maximum 5 photos");
      return;
    }
    
    setPhotos([...photos, ...files]);
    
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
    setPreviews(previews.filter((_, i) => i !== index));
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (photos.length + files.length > 5) {
      toast.error("Maximum 5 photos");
      return;
    }
    setPhotos([...photos, ...files]);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleCategoryAdded = (newCategory: { id: string; name: string }) => {
    setCategories((prev) => [...prev, newCategory]);
    setValue("category_id", String(newCategory.id));
  };

  const handleBrandAdded = (newBrand: { id: string; name: string }) => {
    setBrands((prev) => [...prev, newBrand]);
    setValue("brand_id", String(newBrand.id));
  };

  const requestDeleteCategory = (categoryId: string | number, categoryName: string) => {
    setDeleteTarget({ type: "category", id: categoryId, name: categoryName });
  };

  const requestDeleteBrand = (brandId: string | number, brandName: string) => {
    setDeleteTarget({ type: "brand", id: brandId, name: brandName });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === "category") {
        await deleteCategory(deleteTarget.id);
        await refreshCategories();
        if (watch("category_id") === String(deleteTarget.id)) {
          setValue("category_id", "");
        }
        toast.success("Catégorie supprimée");
      } else {
        await deleteBrand(deleteTarget.id);
        await refreshBrands();
        if (watch("brand_id") === String(deleteTarget.id)) {
          setValue("brand_id", "");
        }
        toast.success("Marque supprimée");
      }
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la suppression");
    } finally {
      setDeleteTarget(null);
    }
  };

  const onSubmit = async (data: ProductFormValues, isDraft: boolean = false) => {
    setLoading(true);
    try {
      const userStr = localStorage.getItem("fc_user");
      let userId = 1;
      if (userStr) {
        try {
          const userObj = JSON.parse(userStr);
          userId = userObj.id || userObj.userId || 1;
        } catch (e) {}
      }

      const productData = {
        ...data,
        user_id: userId,
        status: isDraft ? 'draft' : 'published',
      };

      const created = await createProduct(productData);

      if (photos.length > 0) {
        await uploadProductPhotos(created.id, photos);
      }

      toast.success(isDraft ? "Brouillon sauvegardé !" : "Produit créé avec succès !");
      router.push("/produits");

    } catch (error: any) {
      toast.error(error.message || "Impossible de contacter le serveur");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitDraft = handleSubmit((data: ProductFormValues) => onSubmit(data, true));
  const handleSubmitPublish = handleSubmit((data: ProductFormValues) => onSubmit(data, false));

  // Styles constants as requested
  const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-fp focus:border-fp bg-white placeholder-gray-400";
  const sectionClass = "bg-white p-6 border border-gray-200 rounded-lg shadow-none";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <div className="max-w-[72rem] mx-auto pb-12">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/produits" className="p-2 border border-gray-200 rounded-md bg-white hover:bg-gray-50 text-gray-500 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Add Product</h1>
        </div>
        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={() => router.push("/produits")}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            disabled={loading}
          >
            Discard
          </button>
          <button 
            type="button"
            className="px-4 py-2 bg-white text-fp border border-fp/20 rounded-lg font-medium hover:bg-fp-light transition-colors shadow-sm"
            onClick={handleSubmitDraft}
            disabled={loading}
          >
            Save draft
          </button>
          <button 
            type="button"
            className="px-4 py-2 bg-fp text-white rounded-lg font-medium hover:bg-fp-hover shadow-sm transition-colors"
            onClick={handleSubmitPublish}
            disabled={loading}
          >
            Publish Product
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* COLONNE GAUCHE */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className={sectionClass}>
            <h2 className="text-base font-semibold text-gray-900 mb-4">Product Details</h2>
            
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Name</label>
                <input type="text" {...register("name")} className={inputClass} placeholder="Short sleeve t-shirt" />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Reference</label>
                  <input type="text" {...register("reference")} className={inputClass} placeholder="Auto if empty" />
                </div>
                <div>
                  <label className={labelClass}>Barcode</label>
                  <input type="text" {...register("barcode")} className={inputClass} placeholder="0123-4567" />
                </div>
              </div>

              <div>
                <label className={labelClass}>Description <span className="text-gray-400 font-normal">(Optional)</span></label>
                <textarea 
                  {...register("description")} 
                  className={`${inputClass} min-h-[120px] resize-y`} 
                  placeholder="Details about the product..."
                />
              </div>
            </div>
          </div>

          <div className={sectionClass}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-base font-semibold text-gray-900">Product Images</h2>
              <span className="text-sm text-fp cursor-pointer hover:underline">Add media from URL</span>
            </div>
            
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-gray-400 transition-colors cursor-pointer"
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => document.getElementById("file-upload")?.click()}
            >
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm text-gray-600 font-medium">Drop your images here</p>
              <p className="text-xs text-gray-500 mt-1">or click to browse</p>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
            </div>

            {previews.length > 0 && (
              <div className="grid grid-cols-5 gap-4 mt-4">
                {previews.map((preview, i) => (
                  <div key={i} className="relative group rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                    <img src={preview} alt="preview" className="w-full h-24 object-cover" />
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removePhoto(i); }}
                      className="absolute top-1 right-1 bg-white text-gray-600 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white shadow-sm"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={sectionClass}>
            <h2 className="text-base font-semibold text-gray-900 mb-4">Caractéristiques</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Taille <span className="text-gray-400 font-normal">(Optional)</span></label>
                <input type="text" {...register("size")} className={inputClass} placeholder="M, 42, etc." />
              </div>
              <div>
                <label className={labelClass}>Couleur <span className="text-gray-400 font-normal">(Optional)</span></label>
                <input type="text" {...register("color")} className={inputClass} placeholder="Noir, Rouge..." />
              </div>
            </div>

            <div className="mt-4">
              <label className={labelClass}>État</label>
              <Controller
                name="condition"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger className="w-full bg-white h-10 rounded-lg border-gray-300 shadow-none">
                      <SelectValue placeholder="État du produit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EXCELLENT">Excellent état</SelectItem>
                      <SelectItem value="VERY_GOOD">Très bon état</SelectItem>
                      <SelectItem value="GOOD">Bon état</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            
            <div className="mt-4">
              <label className={labelClass}>Marque</label>
              {/* Ligne : select + bouton ⊕ */}
              <div className="flex gap-2 items-center">
                <div className="flex-1">
                  <Controller
                    name="brand_id"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="w-full bg-white h-10 rounded-lg border-gray-300 shadow-none">
                          <SelectValue placeholder="Select brand" />
                        </SelectTrigger>
                        <SelectContent>
                          {brands.map((b) => (
                            <div key={b.id} className="relative group">
                              <SelectItem value={String(b.id)} className="pr-8">
                                {b.name}
                              </SelectItem>
                              <button
                                onClick={async (e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  requestDeleteBrand(b.id, b.name);
                                }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 z-50"
                                type="button"
                                aria-label={`Supprimer ${b.name}`}
                                title={`Supprimer ${b.name}`}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={() => setShowAddBrand(true)}
                  className="h-10 w-10 rounded-xl shrink-0 border-gray-300 hover:bg-gray-50"
                  title="Ajouter une marque"
                >
                  <PlusCircle className="h-5 w-5 text-gray-700" strokeWidth={1.5} />
                </Button>
              </div>
              {errors.brand_id && <p className="text-red-500 text-xs mt-1">{errors.brand_id.message}</p>}
            </div>
          </div>
          
        </div>

        {/* COLONNE DROITE */}
        <div className="lg:col-span-1 space-y-6">
          
          <div className={sectionClass}>
            <h2 className="text-base font-semibold text-gray-900 mb-4">Pricing</h2>
            
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Prix de vente (FCFA)</label>
                <input type="number" {...register("sale_price", { valueAsNumber: true })} className={inputClass} placeholder="0" />
                {errors.sale_price && <p className="text-red-500 text-xs mt-1">{errors.sale_price.message}</p>}
              </div>

              <div>
                <label className={labelClass}>Prix d'achat (FCFA)</label>
                <input type="number" {...register("purchase_price", { valueAsNumber: true })} className={inputClass} placeholder="0" />
                {errors.purchase_price && <p className="text-red-500 text-xs mt-1">{errors.purchase_price.message}</p>}
              </div>
              
            </div>
          </div>

          <div className={sectionClass}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-base font-semibold text-gray-900">Stock</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Quantité</label>
                <input type="number" {...register("quantity", { valueAsNumber: true })} className={inputClass} placeholder="0" />
                {errors.quantity && <p className="text-red-500 text-xs mt-1">{errors.quantity.message}</p>}
              </div>
              <div>
                <label className={labelClass}>Seuil min stock</label>
                <input type="number" {...register("min_stock", { valueAsNumber: true })} className={inputClass} placeholder="2" />
                {errors.min_stock && <p className="text-red-500 text-xs mt-1">{errors.min_stock.message}</p>}
              </div>
            </div>
          </div>

          <div className={sectionClass}>
            <h2 className="text-base font-semibold text-gray-900 mb-4">Categories</h2>

            <div>
              <label className={labelClass}>Catégorie</label>
              {/* Ligne : select + bouton ⊕ */}
              <div className="flex gap-2 items-center">
                <div className="flex-1">
                  <Controller
                    name="category_id"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="w-full bg-white h-10 rounded-lg border-gray-300 shadow-none">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((c) => (
                            <div key={c.id} className="relative group">
                              <SelectItem value={String(c.id)} className="pr-8">
                                {c.name}
                              </SelectItem>
                              <button
                                onClick={async (e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  requestDeleteCategory(c.id, c.name);
                                }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 z-50"
                                type="button"
                                aria-label={`Supprimer ${c.name}`}
                                title={`Supprimer ${c.name}`}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={() => setShowAddCategory(true)}
                  className="h-10 w-10 rounded-xl shrink-0 border-gray-300 hover:bg-gray-50"
                  title="Ajouter une catégorie"
                >
                  <PlusCircle className="h-5 w-5 text-gray-700" strokeWidth={1.5} />
                </Button>
              </div>
              {errors.category_id && <p className="text-red-500 text-xs mt-1">{errors.category_id.message}</p>}
            </div>
          </div>
          
        </div>
      </div>

      {/* ─── Modaux d'ajout inline ─────────────────────────────────── */}
      <AddCategoryModal
        open={showAddCategory}
        onOpenChange={setShowAddCategory}
        onSuccess={handleCategoryAdded}
      />
      <AddBrandModal
        open={showAddBrand}
        onOpenChange={setShowAddBrand}
        onSuccess={handleBrandAdded}
      />

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Supprimer {deleteTarget?.type === "category" ? "cette catégorie" : "cette marque"} ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.name ? (
                <>
                  Confirmez la suppression de <b>{deleteTarget.name}</b>. Cette action est irréversible.
                </>
              ) : (
                "Confirmez la suppression. Cette action est irréversible."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-500 text-white hover:bg-red-600">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
