import { Skeleton } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'

export default function MonitorsLoading() {
  return (
    <div className="px-8 py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <Skeleton className="h-6 w-28 mb-2" />
          <Skeleton className="h-4 w-36" />
        </div>
        <Skeleton className="h-7 w-28 rounded-md" />
      </div>
      <Skeleton className="h-10 w-full max-w-sm mb-4" />
      <Card>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </Card>
    </div>
  )
}
