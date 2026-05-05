"use client";

import { useEffect, useState } from "react";
import { ProduitsClient } from "./produits-client";
import ProduitsLoading from "./loading";
import { getProducts } from "@/lib/api";

export default function ProduitsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const data = await getProducts();
        setProducts(data || []);
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
