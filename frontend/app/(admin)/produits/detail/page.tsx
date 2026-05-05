import { Suspense } from "react";
import ProductDetailPageContent from "./page-content";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProductDetailPage() {
  return (
    <Suspense fallback={
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-4 w-96" />
        <Skeleton className="w-full h-[420px] rounded-2xl" />
      </div>
    }>
      <ProductDetailPageContent />
    </Suspense>
  );
}
