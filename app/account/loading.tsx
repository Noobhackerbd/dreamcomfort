// Instant skeleton for the account area (prefetched by <Link>).
export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-4 md:py-8 animate-pulse">
      <div className="grid gap-4 md:grid-cols-[260px_minmax(0,1fr)]">
        <div className="rounded-2xl border border-black/[0.06] bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-black/5" />
            <div className="flex-1 space-y-2"><div className="h-3 w-2/3 bg-black/5 rounded" /><div className="h-2.5 w-1/2 bg-black/5 rounded" /></div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 rounded-xl border border-black/[0.06] bg-white" />)}
          </div>
          <div className="h-40 rounded-2xl border border-black/[0.06] bg-white" />
        </div>
      </div>
    </div>
  );
}
