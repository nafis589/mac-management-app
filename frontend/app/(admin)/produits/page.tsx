import { Suspense } from "react"
import { ProduitsClient } from "./produits-client"
import ProduitsLoading from "./loading"

const API_BASE = "http://localhost:4000/api"

async function getProducts() {
  try {
    const res = await fetch(`${API_BASE}/products`, { cache: 'no-store' })
    if (!res.ok) return []
    const data = await res.json()
    return data.data || []
  } catch (error) {
    console.error("Failed to fetch products:", error)
    return []
  }
}

export default async function ProduitsPage() {
  // Le composant serveur s'occupe du fetch initial
  const products = await getProducts()

  return (
    <Suspense fallback={<ProduitsLoading />}>
      {/* Et le composant client gère l'interactivité (recherche, filtres, pagination) */}
      <ProduitsClient initialProducts={products} />
    </Suspense>
  )
}
