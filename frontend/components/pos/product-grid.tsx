"use client"

import * as React from "react"
import { Search, Plus, Loader2, Tag, Maximize } from "lucide-react"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { Product, getPhotoUrl, usePosStore } from "@/lib/pos-store"

import { useRouter } from "next/navigation"

interface Category {
  id: number
  name: string
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value)
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debouncedValue
}

const API_BASE = "http://localhost:4000/api"

export function ProductGrid() {
  const router = useRouter()
  const { cart, addToCart } = usePosStore()
  const [products, setProducts] = React.useState<Product[]>([])
  const [categories, setCategories] = React.useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = React.useState<string>("all")
  const [search, setSearch] = React.useState("")
  const debouncedSearch = useDebounce(search, 300)
  const [isLoading, setIsLoading] = React.useState(true)

  const fetchProducts = React.useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await fetch(`${API_BASE}/products`)
      const data = await res.json()
      if (data.success) setProducts(data.data)
    } catch { /* silently fail */ } finally {
      setIsLoading(false)
    }
  }, [])

  const fetchCategories = React.useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/categories`)
      const data = await res.json()
      if (data.success) setCategories(data.data)
    } catch { /* silently fail */ }
  }, [])

  React.useEffect(() => {
    fetchProducts()
    fetchCategories()
  }, [fetchProducts, fetchCategories])

  // Expose fetchProducts for external refresh
  React.useEffect(() => {
    (window as any).__posRefreshProducts = fetchProducts
    return () => { delete (window as any).__posRefreshProducts }
  }, [fetchProducts])

  const filteredProducts = React.useMemo(() => {
    let filtered = products.filter(p => p.quantity > 0)
    if (selectedCategory !== "all") {
      filtered = filtered.filter(p => String(p.category_id) === selectedCategory || p.category_name === selectedCategory)
    }
    if (debouncedSearch) {
      const lower = debouncedSearch.toLowerCase()
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(lower) ||
        p.reference.toLowerCase().includes(lower)
      )
    }
    return filtered.slice(0, 60)
  }, [products, debouncedSearch, selectedCategory])

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
      {/* Search Bar */}
      <div className="p-4 pb-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Rechercher un produit..."
            className="pl-10 h-11 rounded-xl border-gray-200 bg-white shadow-none text-sm focus-visible:ring-1 focus-visible:ring-orange-300"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Category Tabs */}
      <div className="px-4 pb-3">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setSelectedCategory("all")}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
              selectedCategory === "all"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
            )}
          >
            Tout
            <span className="ml-1.5 text-xs opacity-80">{products.filter(p => p.quantity > 0).length}</span>
          </button>
          {categories.map((cat) => {
            const count = products.filter(p => p.quantity > 0 && (String(p.category_id) === String(cat.id) || p.category_name === cat.name)).length
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(String(cat.id))}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                  selectedCategory === String(cat.id)
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                )}
              >
                {cat.name}
                <span className="ml-1.5 text-xs opacity-80">{count}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Products Grid */}
      <ScrollArea className="flex-1 px-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-gray-300" />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400">
            <Tag className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm">Aucun produit trouvé</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 pb-6">
            {filteredProducts.map(product => {
              const photoUrl = getPhotoUrl(product.photos)
              const inCart = cart.find(i => i.id === product.id)?.cartQuantity || 0

              return (
                <div
                  key={product.id}
                  className="bg-white rounded-2xl border border-gray-100 group relative p-2"
                >
                  {/* Image */}
                  <div 
                    className="aspect-[4/3] bg-gray-100/80 rounded-xl relative overflow-hidden flex items-center justify-center p-4 cursor-pointer"
                    onClick={() => router.push(`/produits/detail?id=${product.id}&viewOnly=true`)}
                  >

                    {photoUrl ? (
                      <img src={photoUrl} alt={product.name} className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300">
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
                  <div className="pt-3 px-1 pb-1">
                    <h3 className="font-medium text-gray-900 text-sm leading-tight line-clamp-1 mb-1">{product.name}</h3>
                    <div className="flex items-center justify-between mt-3">
                      <span className="font-bold text-gray-900 text-sm">
                        {Number(product.sale_price).toLocaleString("fr-FR")} F
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); addToCart(product); }}
                        className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors active:scale-95 shrink-0"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
