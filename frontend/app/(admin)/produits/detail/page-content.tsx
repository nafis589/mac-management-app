'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  Pencil,
  Trash2,
  CircleDollarSign,
  Truck,
  Layers,
  Repeat2,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
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

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
interface Product {
  id: string;
  name: string;
  reference: string;
  // Champs plats retournés par le JOIN backend
  category_id: string;
  category_name?: string;
  brand_id: string;
  brand_name?: string;
  size?: string;
  color: string;
  condition: 'EXCELLENT' | 'VERY_GOOD' | 'GOOD';
  purchase_price: number;
  sale_price: number;
  quantity: number;
  min_stock: number;
  description?: string;
  photos: string[];
  created_at: string;
  stats: {
    total_sold: number;
    total_revenue: number;
    available_stock: number;
  };
}

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
const conditionLabel: Record<string, string> = {
  EXCELLENT: 'Excellent',
  VERY_GOOD: 'Très bon état',
  GOOD: 'Bon état',
};

function parsePhotos(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter(Boolean);
  if (typeof raw === 'string') {
    try {
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr.filter(Boolean) : [];
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Mappe un nom de couleur français vers une couleur CSS valide.
 * Si la couleur est déjà un code hex ou rgb, on la retourne telle quelle.
 */
const COLOR_MAP: Record<string, string> = {
  noir: '#111111', black: '#111111',
  blanc: '#FFFFFF', white: '#FFFFFF',
  rouge: '#EF4444', red: '#EF4444',
  bleu: '#3B82F6', blue: '#3B82F6',
  vert: '#22C55E', green: '#22C55E',
  jaune: '#EAB308', yellow: '#EAB308',
  orange: '#F97316',
  rose: '#EC4899', pink: '#EC4899',
  violet: '#8B5CF6', purple: '#8B5CF6',
  marron: '#92400E', brown: '#92400E',
  gris: '#6B7280', grey: '#6B7280', gray: '#6B7280',
  beige: '#D4B896',
  bordeaux: '#9F1239',
  marine: '#1E3A5F',
  kaki: '#78716C',
};

function resolveColor(color: string | undefined): string {
  if (!color) return '#E5E7EB';
  const key = color.toLowerCase().trim();
  if (COLOR_MAP[key]) return COLOR_MAP[key];
  // Si c'est déjà un code hex ou une couleur CSS valide
  if (key.startsWith('#') || key.startsWith('rgb')) return key;
  // Sinon fallback gris
  return '#6B7280';
}

/* ─────────────────────────────────────────────
   KPI Card
───────────────────────────────────────────── */
function KpiCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 min-w-0 overflow-hidden">
      <div className="flex items-center gap-2 text-gray-500 text-xs font-medium">
        <span className="flex items-center justify-center w-7 h-7 rounded-full bg-fp/10 text-fp flex-shrink-0">
          <Icon size={13} strokeWidth={1.8} />
        </span>
        <span className="truncate">{label}</span>
      </div>
      <p className="text-lg font-bold text-gray-900 leading-tight truncate">{value}</p>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Page
───────────────────────────────────────────── */
export default function ProductDetailPageContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id') as string;
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isViewOnly, setIsViewOnly] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsViewOnly(new URLSearchParams(window.location.search).get('viewOnly') === 'true');
    }
    loadProduct();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadProduct = async () => {
    try {
      const res = await fetch(`http://localhost:4000/api/products/${id}`);
      if (!res.ok) throw new Error('Produit non trouvé');
      const json = await res.json();
      const d = json.data;
      d.photos = parsePhotos(d.photos);
      if (!d.stats) {
        d.stats = { total_sold: 0, total_revenue: 0, available_stock: d.quantity };
      }
      setProduct(d);
    } catch {
      toast.error('Erreur de chargement');
      router.push('/produits');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`http://localhost:4000/api/products/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error();
      toast.success('Produit supprimé');
      router.push('/produits');
    } catch {
      toast.error('Erreur lors de la suppression');
    } finally {
      setShowDeleteModal(false);
    }
  };

  const prevImage = () =>
    setSelectedImage((i) => (i === 0 ? (product!.photos.length - 1) : i - 1));
  const nextImage = () =>
    setSelectedImage((i) => (i === product!.photos.length - 1 ? 0 : i + 1));

  /* ---- Loading skeleton ---- */
  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <Skeleton className="h-8 w-72" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24 rounded-full" />
            <Skeleton className="h-9 w-9 rounded-full" />
          </div>
        </div>
        <div className="flex gap-6">
          <Skeleton className="w-[340px] h-[420px] rounded-2xl flex-shrink-0" />
          <div className="flex-1 space-y-4">
            <div className="grid grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
            </div>
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) return null;

  const photos = product.photos;
  const imgSrc = (path: string) => `http://localhost:4000${path}`;

  const infoRows = [
    { label: 'Catégorie', value: product.category_name ?? '—' },
    { label: 'Marque', value: product.brand_name ?? '—' },
    { label: 'Couleur', value: product.color ?? '—' },
    { label: 'État', value: conditionLabel[product.condition] ?? product.condition },
    { label: 'Stock', value: String(product.quantity) },
  ];

  return (
    <div className="p-6 bg-white min-h-full">

      {/* ── HEADER ── */}
      <div className="flex items-start justify-between mb-7">
        <div className="flex items-center gap-4">
          {/* Bouton retour */}
          <Link
            href={isViewOnly ? "/ventes" : "/produits"}
            className="p-2 border border-gray-200 rounded-md bg-white hover:bg-gray-50 text-gray-500 transition-colors flex-shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 leading-none">{product.name}</h1>
            <p className="mt-1.5 text-[0.82rem] text-gray-500">
              <span>Seller : <b className="font-semibold text-gray-800">Friperie de Luxe</b></span>
              &nbsp;&nbsp;
              <span>Published : <b className="font-semibold text-gray-800">{format(new Date(product.created_at), 'dd MMM, yyyy')}</b></span>
              &nbsp;&nbsp;
              <span>SKU : <b className="font-semibold text-gray-800">{product.reference}</b></span>
            </p>
          </div>
        </div>

        {/* Boutons Edit / Delete */}
        {!isViewOnly && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push(`/produits/detail/modifier?id=${product.id}`)}
              className="inline-flex items-center gap-2 bg-white text-fp border border-fp/20 hover:bg-fp/10 text-sm font-medium rounded-lg px-4 py-2 shadow-sm transition-colors"
            >
              <Pencil size={15} strokeWidth={2} />
              Éditer
            </button>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="inline-flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg px-4 py-2 shadow-sm transition-colors"
            >
              <Trash2 size={15} strokeWidth={2} />
              Supprimer
            </button>
          </div>
        )}
      </div>

      {/* ── MAIN LAYOUT : Gauche = Galerie | Droite = KPIs + contenu ── */}
      <div className="flex gap-7">

        {/* ─── COLONNE GAUCHE : Image + Thumbnails ─── */}
        <div className="flex-shrink-0 w-[340px]">
          {/* Image principale avec navigation */}
          <div className="relative rounded-2xl overflow-hidden bg-gray-100" style={{ height: 370 }}>
            {photos.length > 0 ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imgSrc(photos[selectedImage])}
                alt={product.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = '/placeholder-product.png';
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                Aucune image
              </div>
            )}

            {/* Flèche gauche */}
            {photos.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white flex items-center justify-center text-fp hover:bg-gray-50 transition-colors"
                >
                  <ChevronLeft size={18} strokeWidth={2.5} />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white flex items-center justify-center text-fp hover:bg-gray-50 transition-colors"
                >
                  <ChevronRight size={18} strokeWidth={2.5} />
                </button>
              </>
            )}
          </div>

          {/* Thumbnails */}
          {photos.length > 1 && (
            <div className="flex gap-2 mt-3">
              {photos.map((photo, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImage(i)}
                  className={`w-[75px] h-[75px] rounded-lg overflow-hidden border-1 flex-shrink-0 transition-all ${i === selectedImage
                    ? 'border-gray-300'
                    : 'border-transparent hover:border-gray-300'
                    }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imgSrc(photo)}
                    alt={`${product.name} ${i + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = '/placeholder-product.png';
                    }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ─── COLONNE DROITE : KPIs + Content ─── */}
        <div className="flex-1 flex flex-col gap-6 min-w-0">

          {/* KPI cards — 4 en ligne */}
          <div className="grid grid-cols-4 gap-4">
            <KpiCard
              icon={CircleDollarSign}
              label="Price"
              value={`${Number(product.sale_price).toLocaleString('fr-FR')} FCFA`}
            />
            <KpiCard
              icon={Truck}
              label="No. of Orders"
              value={String(product.stats.total_sold)}
            />
            <KpiCard
              icon={Layers}
              label="Available Stocks"
              value={`${product.quantity}`}
            />
            <KpiCard
              icon={Repeat2}
              label="Total Revenue"
              value={`${Number(product.stats.total_revenue).toLocaleString('fr-FR')} FCFA`}
            />
          </div>

          {/* ── Content + Info table — dans une card bordurée ── */}
          <div className="border border-gray-200 rounded-xl p-5 flex gap-8 min-w-0">

            {/* Description, Features, Colors, Sizes */}
            <div className="flex-1 space-y-5 min-w-0">

              {/* Description */}
              <div>
                <h2 className="text-base font-bold text-gray-900 mb-2">Description:</h2>
                <p className="text-sm text-gray-900 leading-relaxed">
                  {product.description || 'Aucune description disponible.'}
                </p>
              </div>

              {/* Key Features */}
              <div>
                <h2 className="text-base font-bold text-gray-900 mb-2">Key Features:</h2>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-sm text-gray-900">
                    <span className="w-1.5 h-1.5 rounded-full bg-fp flex-shrink-0" />
                    État : {conditionLabel[product.condition] ?? product.condition}
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-900">
                    <span className="w-1.5 h-1.5 rounded-full bg-fp flex-shrink-0" />
                    Marque : {product.brand_name ?? '—'}
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-900">
                    <span className="w-1.5 h-1.5 rounded-full bg-fp flex-shrink-0" />
                    Catégorie : {product.category_name ?? '—'}
                  </li>
                  {product.size && (
                    <li className="flex items-center gap-2 text-sm text-gray-900">
                      <span className="w-1.5 h-1.5 rounded-full bg-fp flex-shrink-0" />
                      Taille : {product.size}
                    </li>
                  )}
                </ul>
              </div>

              {/* Colors + Sizes sur la même ligne */}
              <div className="flex items-start gap-10">
                {/* Colors */}
                <div>
                  <h2 className="text-base font-bold text-gray-900 mb-2">Colors:</h2>
                  <div className="flex items-center gap-2">
                    <button
                      className="w-9 h-9 rounded-full border-[3px] border-white ring-2 ring-offset-1 ring-gray-300 shadow-sm"
                      style={{ backgroundColor: resolveColor(product.color) }}
                      title={product.color}
                    />
                    <span className="text-sm text-gray-600 capitalize">{product.color}</span>
                  </div>
                </div>

                {/* Sizes */}
                <div>
                  <h2 className="text-base font-bold text-gray-900 mb-2">Sizes:</h2>
                  <div className="flex items-center gap-2 flex-wrap">
                    {product.size ? (
                      <button className="px-4 py-1.5 rounded-full text-sm font-medium border border-fp text-fp bg-fp/5">
                        {product.size}
                      </button>
                    ) : (
                      <button className="px-4 py-1.5 rounded-full text-sm font-medium border border-fp text-fp bg-fp/5">
                        Unique
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Add to Card / Wishlist — MASQUÉS (gestion stock, pas e-commerce) */}
            </div>

            {/* ── Table info — séparateurs entre lignes ── */}
            <div className="w-44 flex-shrink-0 divide-y divide-gray-100 text-[0.82rem] self-start">
              {infoRows.map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-4 py-2.5">
                  <span className="font-bold text-gray-800">{row.label}</span>
                  <span className="text-gray-600 text-right">{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <AlertDialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce produit ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer définitivement ce produit ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 text-white hover:bg-red-600">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
