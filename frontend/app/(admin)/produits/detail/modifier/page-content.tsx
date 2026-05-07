"use client";

import React, { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Upload, X, ArrowLeft, PlusCircle } from "lucide-react";
import Link from "next/link";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { AddCategoryModal } from "@/components/AddCategoryModal";
import { AddBrandModal } from "@/components/AddBrandModal";
import { 
  getProductById, 
  getCategories, 
  getBrands, 
  updateProduct, 
  uploadProductPhotos, 
  deleteProductPhoto,
  resolveImageUrl,
  deleteCategory,
  deleteBrand,
} from "@/lib/api";
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
  // min(0) pour ne pas bloquer le reset initial avec des valeurs non encore saisies
  sale_price: z.number().min(0, "Prix de vente requis"),
  purchase_price: z.number().min(0, "Prix d'achat requis"),
  quantity: z.number().min(0),
  min_stock: z.number().min(0).default(2),
  in_stock: z.boolean().default(true),
  charge_tax: z.boolean().default(false),
}).refine(data => data.sale_price === 0 || data.purchase_price === 0 || data.sale_price > data.purchase_price, {
  message: "Prix de vente doit être > prix d'achat",
  path: ["sale_price"]
});

type ProductFormValues = z.infer<typeof productSchema>;

export default function ModifierProduitPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id') as string;

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  // Photos déjà enregistrées sur le serveur (chemins relatifs type /uploads/products/...)
  const [existingPhotos, setExistingPhotos] = useState<string[]>([]);

  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);

  // Contrôle des modaux d'ajout inline
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddBrand, setShowAddBrand] = useState(false);
  const [photoToDelete, setPhotoToDelete] = useState<number | null>(null);

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

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
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

  useEffect(() => {
    // Load product details, categories and brands
    Promise.all([
      getProductById(id).catch(() => null),
      refreshCategories().catch(() => []),
      refreshBrands().catch(() => [])
    ]).then(([productData, catData, brandData]) => {

      if (catData) setCategories(catData);
      if (brandData) setBrands(brandData);

      if (productData) {
        const prod = productData;
        reset({
          name: prod.name || "",
          reference: prod.reference || "",
          barcode: prod.barcode || "",
          description: prod.description || "",
          category_id: String(prod.category_id || ""),
          brand_id: String(prod.brand_id || ""),
          size: prod.size || "",
          color: prod.color || "",
          condition: prod.condition || "EXCELLENT",
          sale_price: Number(prod.sale_price) || 0,
          purchase_price: Number(prod.purchase_price) || 0,
          quantity: prod.quantity !== undefined && prod.quantity !== null ? Number(prod.quantity) : 0,
          min_stock: prod.min_stock !== undefined && prod.min_stock !== null ? Number(prod.min_stock) : 2,
          in_stock: prod.in_stock !== undefined && prod.in_stock !== null ? (prod.in_stock === true || String(prod.in_stock) === "true" || String(prod.in_stock) === "1" || prod.in_stock === 1) : true,
          charge_tax: false
        });

        // Load existing photos if any
        if (prod.photos) {
          try {
            const parsedPhotos = typeof prod.photos === "string" ? JSON.parse(prod.photos) : prod.photos;
            if (Array.isArray(parsedPhotos)) {
              setExistingPhotos(parsedPhotos);
            }
          } catch (e) {
            console.error("Error parsing photos JSON", e);
          }
        }
      }
    }).catch(err => {
      console.error("Erreur chargement données", err);
      toast.error("Impossible de charger les détails du produit");
    }).finally(() => {
      setInitialLoading(false);
    });
  }, [id, reset]);

  /**
   * Appelé après création d'une catégorie depuis la modal.
   */
  const handleCategoryAdded = (newCategory: { id: string; name: string }) => {
    setCategories((prev) => [...prev, newCategory]);
    setValue("category_id", String(newCategory.id));
  };

  /**
   * Appelé après création d'une marque depuis la modal.
   */
  const handleBrandAdded = (newBrand: { id: string; name: string }) => {
    setBrands((prev) => [...prev, newBrand]);
    setValue("brand_id", String(newBrand.id));
  };

  const [deleteTarget, setDeleteTarget] = useState<
    | { type: "category" | "brand"; id: string | number; name: string }
    | null
  >(null);

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

  const inStock = watch("in_stock");
  const chargeTax = watch("charge_tax");

  const confirmDeleteExistingPhoto = async () => {
    if (photoToDelete === null) return;
    const index = photoToDelete;
    
    try {
      const data = await deleteProductPhoto(id, index);
      setExistingPhotos(data.photos);
      toast.success('Image supprimée');
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la suppression');
      console.error(error);
    } finally {
      setPhotoToDelete(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (existingPhotos.length + previews.length + files.length > 5) {
      toast.error("Maximum 5 photos au total");
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
    setPreviews(previews.filter((_, i) => i !== index));
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (existingPhotos.length + previews.length + files.length > 5) {
      toast.error("Maximum 5 photos au total");
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

      await updateProduct(id, productData);

      if (photos.length > 0) {
        await uploadProductPhotos(id, photos);
      }

      toast.success(isDraft ? "Brouillon mis à jour !" : "Produit modifié avec succès !");
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

  // Styles constants
  const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-fp focus:border-fp bg-white placeholder-gray-400";
  const sectionClass = "bg-white p-6 border border-gray-200 rounded-lg shadow-none";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  if (initialLoading) {
    return (
      <div className="max-w-[72rem] mx-auto pb-12 space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="h-9 w-9 bg-gray-200 animate-pulse rounded-md"></div>
          <div className="h-8 w-48 bg-gray-200 animate-pulse rounded"></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="h-96 bg-gray-200 animate-pulse rounded-lg"></div>
            <div className="h-64 bg-gray-200 animate-pulse rounded-lg"></div>
          </div>
          <div className="space-y-6">
            <div className="h-72 bg-gray-200 animate-pulse rounded-lg"></div>
            <div className="h-48 bg-gray-200 animate-pulse rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[72rem] mx-auto pb-12">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/produits" className="p-2 border border-gray-200 rounded-md bg-white hover:bg-gray-50 text-gray-500 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Edition produit</h1>
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
                  <input type="text" {...register("reference")} className={inputClass} placeholder="Auto if empty" disabled />
                  <p className="text-xs text-gray-400 mt-1">Non modifiable</p>
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

            {/* Galerie de photos (existantes + nouvelles) */}
            {(existingPhotos.length > 0 || previews.length > 0) && (
              <div className="mt-4">
                <p className="text-sm font-medium mb-2">Photos ({existingPhotos.length + previews.length}/5)</p>
                <div className="grid grid-cols-5 gap-4">
                  {existingPhotos.map((photo, index) => (
                    <div key={`existing-${index}`} className="relative group rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                      <img
                        src={resolveImageUrl(photo)}
                        alt={`Photo ${index + 1}`}
                        className="w-full h-24 object-cover"
                        onError={(e) => {
                          e.currentTarget.src = '/placeholder-product.png';
                        }}
                      />
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setPhotoToDelete(index); }}
                        className="absolute top-1 right-1 bg-white text-gray-600 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white shadow-sm"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  {previews.map((preview, i) => (
                    <div key={`new-${i}`} className="relative group rounded-lg overflow-hidden border border-fp/20 shadow-sm">
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
                  <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                    <SelectTrigger className="w-full bg-white h-[42px] border-gray-300 shadow-none">
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
                      <Select onValueChange={field.onChange} value={field.value}>
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
                      <Select onValueChange={field.onChange} value={field.value}>
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

      <AlertDialog open={photoToDelete !== null} onOpenChange={(open) => !open && setPhotoToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette image ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cette image ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteExistingPhoto} className="bg-red-500 text-white hover:bg-red-600">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
