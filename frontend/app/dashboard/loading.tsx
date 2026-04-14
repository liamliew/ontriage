export default function DashboardLoading() {
  return (
    <div className="px-8 py-8 max-w-5xl">
      <div className="mb-8">
        <div className="h-6 w-28 bg-neutral-800 rounded animate-pulse" />
        <div className="h-4 w-44 bg-neutral-800 rounded animate-pulse mt-2" />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-10">
        {[0, 1, 2].map((i) => (
          <div key={i} className="border border-neutral-800 rounded-xl p-5 bg-neutral-900/40">
            <div className="h-3 w-20 bg-neutral-800 rounded animate-pulse mb-2" />
            <div className="h-8 w-8 bg-neutral-800 rounded animate-pulse" />
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="h-4 w-16 bg-neutral-800 rounded animate-pulse" />
        <div className="h-7 w-24 bg-neutral-800 rounded-md animate-pulse" />
      </div>

      <div className="border border-neutral-800 rounded-xl overflow-hidden">
        <div className="flex items-center gap-4 px-5 py-3.5 border-b border-neutral-800 bg-neutral-900/60">
          <div className="h-3 w-8 bg-neutral-800 rounded animate-pulse" />
          <div className="h-3 flex-1 bg-neutral-800 rounded animate-pulse" />
          <div className="h-3 w-24 bg-neutral-800 rounded animate-pulse" />
          <div className="h-3 w-10 bg-neutral-800 rounded animate-pulse ml-auto" />
        </div>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`flex items-center gap-4 px-5 py-3.5 ${i > 0 ? 'border-t border-neutral-800' : ''}`}
          >
            <div className="h-3.5 w-3.5 bg-neutral-800 rounded-full animate-pulse shrink-0" />
            <div className="h-4 w-32 bg-neutral-800 rounded animate-pulse flex-1" />
            <div className="h-3 w-48 bg-neutral-800 rounded animate-pulse max-w-xs" />
            <div className="h-3 w-10 bg-neutral-800 rounded animate-pulse ml-auto" />
          </div>
        ))}
      </div>
    </div>
  )
}
