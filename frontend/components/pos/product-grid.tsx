"use client"

import * as React from "react"
import { Search, Loader2, Tag } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { Product } from "@/lib/pos-store"
import { getProducts, getCategories } from "@/lib/api"
import { ProductCard } from "./product-card"
import { useVirtualizer } from "@tanstack/react-virtual"
import MiniSearch from "minisearch"
import localforage from "localforage"

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

export function ProductGrid() {
  const [products, setProducts] = React.useState<Product[]>([])
  const [categories, setCategories] = React.useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = React.useState<string>("all")
  const [search, setSearch] = React.useState("")
  const debouncedSearch = useDebounce(search, 150) // Reduced debounce for faster feel with Minisearch
  const [isLoading, setIsLoading] = React.useState(true)
  const [isBackgroundFetching, setIsBackgroundFetching] = React.useState(false)

  // Memoize MiniSearch instance
  const miniSearch = React.useMemo(() => new MiniSearch({
    fields: ['name', 'reference'],
    storeFields: ['id'], // We just need ID to map back, or we could just use filtered products directly
    searchOptions: {
      prefix: true,
      fuzzy: 0.2 // allow slight typos
    }
  }), [])

  const fetchProducts = React.useCallback(async () => {
    try {
      if (products.length === 0) setIsLoading(true)
      
      // Load from IndexedDB first for instant UI
      const cached = await localforage.getItem<Product[]>('pos_products')
      if (cached && cached.length > 0) {
        setProducts(cached)
        miniSearch.removeAll()
        miniSearch.addAll(cached)
        setIsLoading(false)
        setIsBackgroundFetching(true)
      }

      // Fetch fresh data in background
      const data = await getProducts()
      if (data) {
        setProducts(data)
        miniSearch.removeAll()
        miniSearch.addAll(data)
        await localforage.setItem('pos_products', data)
      }
    } catch (e) {
      console.error("Failed to fetch products:", e)
    } finally {
      setIsLoading(false)
      setIsBackgroundFetching(false)
    }
  }, [miniSearch, products.length])

  const fetchCategoriesList = React.useCallback(async () => {
    try {
      const cached = await localforage.getItem<Category[]>('pos_categories')
      if (cached) setCategories(cached)

      const data = await getCategories()
      if (data) {
        setCategories(data)
        await localforage.setItem('pos_categories', data)
      }
    } catch { /* silently fail */ }
  }, [])

  React.useEffect(() => {
    fetchProducts()
    fetchCategoriesList()
  }, [fetchProducts, fetchCategoriesList])

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
      // Use Minisearch for lightning fast filtering
      const results = miniSearch.search(debouncedSearch)
      const matchedIds = new Set(results.map(r => r.id))
      filtered = filtered.filter(p => matchedIds.has(p.id))
    }

    return filtered
  }, [products, debouncedSearch, selectedCategory, miniSearch])

  // --- Virtualization logic ---
  const parentRef = React.useRef<HTMLDivElement>(null)
  const [cols, setCols] = React.useState(4)

  React.useEffect(() => {
    const updateCols = () => {
      const width = window.innerWidth
      if (width >= 1280) setCols(4)
      else if (width >= 768) setCols(3)
      else setCols(2)
    }
    updateCols()
    window.addEventListener('resize', updateCols)
    return () => window.removeEventListener('resize', updateCols)
  }, [])

  const rowVirtualizer = useVirtualizer({
    count: Math.ceil(filteredProducts.length / cols),
    getScrollElement: () => parentRef.current,
    estimateSize: () => 240, // Approximate height of a product card including gaps
    overscan: 4, // Render 4 rows above/below to prevent blank spaces when scrolling fast
  })

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
          {isBackgroundFetching && (
            <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300 animate-spin" />
          )}
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
            if (count === 0) return null; // Don't show empty categories to save space
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

      {/* Virtualized Grid */}
      <div 
        ref={parentRef} 
        className="flex-1 overflow-y-auto px-4 pb-6 scrollbar-hidden"
        style={{ contain: 'strict' }} // Optimizes paint performance
      >
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex flex-col gap-2 p-2 bg-white rounded-2xl border border-gray-100">
                <div className="aspect-[4/3] rounded-xl bg-gray-100 animate-pulse"></div>
                <div className="h-4 w-3/4 bg-gray-100 animate-pulse rounded mt-2"></div>
                <div className="h-4 w-1/2 bg-gray-100 animate-pulse rounded"></div>
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400">
            <Tag className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm">Aucun produit trouvé</p>
          </div>
        ) : (
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const fromIndex = virtualRow.index * cols;
              const toIndex = Math.min(fromIndex + cols, filteredProducts.length);
              const rowItems = filteredProducts.slice(fromIndex, toIndex);

              return (
                <div
                  key={virtualRow.index}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                    display: 'grid',
                    gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                    gap: '16px',
                    paddingBottom: '16px' // spacing between rows
                  }}
                >
                  {rowItems.map(product => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
