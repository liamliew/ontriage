export default function MonitorsLoading() {
  return (
    <div className="px-8 py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="h-6 w-28 bg-neutral-800 rounded animate-pulse" />
          <div className="h-4 w-36 bg-neutral-800 rounded animate-pulse mt-2" />
        </div>
        <div className="h-7 w-28 bg-neutral-800 rounded-md animate-pulse" />
      </div>

      <div className="border border-neutral-800 rounded-xl overflow-hidden">
        <div className="grid grid-cols-[1fr_2fr_80px_100px] gap-4 px-5 py-2.5 border-b border-neutral-800 bg-neutral-900/60">
          <div className="h-3 w-10 bg-neutral-800 rounded animate-pulse" />
          <div className="h-3 w-8 bg-neutral-800 rounded animate-pulse" />
          <div className="h-3 w-14 bg-neutral-800 rounded animate-pulse" />
          <div className="h-3 w-10 bg-neutral-800 rounded animate-pulse" />
        </div>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`grid grid-cols-[1fr_2fr_80px_100px] gap-4 px-5 py-3.5 items-center ${i > 0 ? 'border-t border-neutral-800' : ''}`}
          >
            <div className="h-4 w-28 bg-neutral-800 rounded animate-pulse" />
            <div className="h-4 w-56 bg-neutral-800 rounded animate-pulse" />
            <div className="h-3 w-10 bg-neutral-800 rounded animate-pulse" />
            <div className="h-3 w-10 bg-neutral-800 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}
