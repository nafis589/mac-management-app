"use client"

import * as React from "react"
import { Plus, Tag } from "lucide-react"
import { Product, getPhotoUrl, usePosStore } from "@/lib/pos-store"
import { useRouter } from "next/navigation"

interface ProductCardProps {
  product: Product
}

export const ProductCard = React.memo(function ProductCard({ product }: ProductCardProps) {
  const router = useRouter()
  // Memoize photo URL resolution to avoid re-calculating on every render
  const photoUrl = React.useMemo(() => getPhotoUrl(product.photos), [product.photos])
  
  // Zustand selector: only re-renders if THIS product's quantity in cart changes
  const inCart = usePosStore(state => state.cart.find(i => i.id === product.id)?.cartQuantity || 0)
  const addToCart = usePosStore(state => state.addToCart)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 group relative p-2 h-full flex flex-col">
      {/* Image */}
      <div 
        className="h-[160px] w-full rounded-xl relative overflow-hidden cursor-pointer"
        onClick={() => router.push(`/produits/detail?id=${product.id}&viewOnly=true`)}
      >
        {photoUrl ? (
          <img 
            src={photoUrl} 
            alt={product.name}
            loading="lazy"
            decoding="async" 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-300">
            <Tag className="h-8 w-8" />
          </div>
        )}
        {inCart > 0 && (
          <div className="absolute top-2 left-2 h-6 min-w-6 px-1.5 rounded-full flex items-center justify-center text-[11px] font-bold text-primary-foreground shadow-md bg-primary">
            {inCart}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="pt-3 px-1 pb-1 mt-auto">
        <h3 className="font-medium text-gray-900 text-sm leading-tight line-clamp-1 mb-1">{product.name}</h3>
        <div className="flex items-center justify-between mt-3">
          <span className="font-bold text-gray-900 text-sm">
            {Number(product.sale_price).toLocaleString("fr-FR")} F
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); addToCart(product); }}
            className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors active:scale-95 shrink-0"
            aria-label={`Ajouter ${product.name} au panier`}
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
})
