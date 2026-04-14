import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'

export default function DashboardLoading() {
  return (
    <div className="px-8 py-8 max-w-5xl">
      <div className="mb-8">
        <Skeleton className="h-6 w-28 mb-2" />
        <Skeleton className="h-4 w-44" />
      </div>
      <div className="grid grid-cols-4 gap-4 mb-10">
        {[0, 1, 2, 3].map((i) => (
          <Card key={i}><CardContent className="p-5"><Skeleton className="h-3 w-20 mb-2" /><Skeleton className="h-8 w-8" /></CardContent></Card>
        ))}
      </div>
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-7 w-24 rounded-md" />
      </div>
      <Card>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </Card>
    </div>
  )
}
