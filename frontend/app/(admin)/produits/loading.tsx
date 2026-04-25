import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

export default function ProduitsLoading() {
  return (
    <section>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start gap-4">
            <div>
              <CardTitle className="leading-none text-2xl mb-1">
                <Skeleton className="h-8 w-32" />
              </CardTitle>
              <CardDescription>
                <Skeleton className="h-4 w-64 mt-2" />
              </CardDescription>
            </div>
            <Skeleton className="h-10 w-40" />
          </div>
          <div className="mt-4 pt-4 border-t flex flex-wrap items-center gap-2">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-9 w-32" />
            <div className="flex gap-2 ml-auto">
              <Skeleton className="h-9 w-20" />
              <Skeleton className="h-9 w-20" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 px-0">
          <div className="overflow-x-auto px-6">
            <div className="w-full flex items-center gap-4 py-4 border-y">
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={`h-${i}`} className="h-4 flex-1" />
              ))}
            </div>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={`row-${i}`} className="flex items-center gap-4 py-4 border-b">
                <Skeleton className="h-12 w-12 rounded-md shrink-0" />
                {Array.from({ length: 6 }).map((_, j) => (
                  <Skeleton key={`cell-${i}-${j}`} className="h-4 flex-1" />
                ))}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between gap-4 px-6 pt-2 pb-2">
            <Skeleton className="h-4 w-40" />
            <div className="flex gap-2">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-9" />
              <Skeleton className="h-9 w-9" />
              <Skeleton className="h-9 w-9" />
              <Skeleton className="h-9 w-24" />
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
