import { Suspense } from "react"
import { StockClient } from "./stock-client"
import { Loader2 } from "lucide-react"

const API_BASE = "http://localhost:4000/api"

async function getStockDashboard() {
  try {
    const res = await fetch(`${API_BASE}/stock/dashboard`, { cache: 'no-store' })
    if (!res.ok) return { totalProducts: 0, stockValue: 0, lowStockCount: 0 }
    const data = await res.json()
    return data.data || { totalProducts: 0, stockValue: 0, lowStockCount: 0 }
  } catch (error) {
    return { totalProducts: 0, stockValue: 0, lowStockCount: 0 }
  }
}

async function getLowStockAlerts() {
  try {
    const res = await fetch(`${API_BASE}/stock/alerts`, { cache: 'no-store' })
    if (!res.ok) return []
    const data = await res.json()
    return data.data || []
  } catch (error) {
    return []
  }
}

async function getStockMovements() {
  try {
    const res = await fetch(`${API_BASE}/stock`, { cache: 'no-store' })
    if (!res.ok) return []
    const data = await res.json()
    return data.data || []
  } catch (error) {
    return []
  }
}

export default async function StockPage() {
  const [dashboard, alerts, movements] = await Promise.all([
    getStockDashboard(),
    getLowStockAlerts(),
    getStockMovements()
  ])

  return (
    <Suspense fallback={<div className="flex h-64 items-center justify-center"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>}>
      <StockClient 
        initialDashboard={dashboard} 
        initialAlerts={alerts} 
        initialMovements={movements} 
      />
    </Suspense>
  )
}
