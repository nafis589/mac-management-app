import { create } from "zustand"
import { resolveImageUrl } from "@/lib/api"

export interface Product {
  id: number
  reference: string
  name: string
  quantity: number
  sale_price: string | number
  photos?: string
  category_name?: string
  category_id?: number
  brand_name?: string
  size?: string
  color?: string
}

export interface CartItem extends Product {
  cartQuantity: number
}

interface PosState {
  cart: CartItem[]
  discountType: 'PERCENTAGE' | 'FIXED' | null
  discountValue: number
  addToCart: (product: Product) => void
  updateQuantity: (productId: number, quantity: number) => void
  removeFromCart: (productId: number) => void
  setDiscount: (type: 'PERCENTAGE' | 'FIXED' | null, value: number) => void
  clearCart: () => void
}

export const usePosStore = create<PosState>((set) => ({
  cart: [],
  discountType: null,
  discountValue: 0,
  addToCart: (product) => set((state) => {
    const existing = state.cart.find((item) => item.id === product.id)
    if (existing) {
      if (existing.cartQuantity < product.quantity) {
        return {
          cart: state.cart.map((item) =>
            item.id === product.id ? { ...item, cartQuantity: item.cartQuantity + 1 } : item
          ),
        }
      }
      return state
    }
    if (product.quantity > 0) {
      return { cart: [...state.cart, { ...product, cartQuantity: 1 }] }
    }
    return state
  }),
  updateQuantity: (productId, quantity) => set((state) => ({
    cart: state.cart.map((item) =>
      item.id === productId ? { ...item, cartQuantity: quantity } : item
    ),
  })),
  removeFromCart: (productId) => set((state) => ({
    cart: state.cart.filter((item) => item.id !== productId),
  })),
  setDiscount: (type, value) => set({ discountType: type, discountValue: value }),
  clearCart: () => set({ cart: [], discountType: null, discountValue: 0 }),
}))

export function getPhotoUrl(photosRaw: any) {
  if (!photosRaw) return null
  try {
    const parsed = typeof photosRaw === "string" ? JSON.parse(photosRaw) : photosRaw
    if (Array.isArray(parsed) && parsed.length > 0) {
      const first = parsed[0]
      if (typeof first === "string" && first.trim() !== "") {
        return resolveImageUrl(first)
      }
    } else if (typeof parsed === "string" && parsed.trim() !== "") {
      return resolveImageUrl(parsed.trim())
    }
  } catch {
    const raw = String(photosRaw).trim()
    if (raw !== "") return resolveImageUrl(raw)
  }
  return null
}
