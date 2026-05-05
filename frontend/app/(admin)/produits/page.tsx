"use client";

import { useEffect, useState } from "react";
import { ProduitsClient } from "./produits-client";
import ProduitsLoading from "./loading";

const API_BASE = "http://localhost:4000/api";

export default function ProduitsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch(`${API_BASE}/products`);
        if (res.ok) {
          const data = await res.json();
          setProducts(data.data || []);
        }
      } catch (err) {
        console.error("Failed to fetch products:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  if (loading) {
    return <ProduitsLoading />;
  }

  return <ProduitsClient initialProducts={products} />;
}
