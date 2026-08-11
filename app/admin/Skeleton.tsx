// Shared admin loading skeletons (shown by route-level loading.tsx during data fetch).

export function Bar({ w = "100%", h = 14, className = "" }: { w?: string | number; h?: number; className?: string }) {
  return (
    <div
      className={"rounded bg-gray-200/80 animate-pulse " + className}
      style={{ width: typeof w === "number" ? `${w}px` : w, height: h }}
    />
  );
}

export function CardRowSkeleton() {
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="flex items-start gap-3">
        <div className="h-14 w-14 rounded-lg bg-gray-200/80 animate-pulse shrink-0" />
        <div className="flex-1 space-y-2">
          <Bar w={140} h={16} />
          <Bar w="70%" />
          <Bar w="50%" />
          <div className="pt-3 mt-2 border-t flex justify-between">
            <Bar w={120} h={28} />
            <Bar w={160} h={28} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function ListSkeleton({ title, rows = 6 }: { title?: boolean; rows?: number }) {
  return (
    <div>
      {title && <Bar w={180} h={26} className="mb-6" />}
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <CardRowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export function StatsSkeleton() {
  return (
    <div>
      <Bar w={160} h={26} className="mb-6" />
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-white p-5 space-y-3">
            <Bar w="60%" h={12} />
            <Bar w="40%" h={22} />
          </div>
        ))}
      </div>
      <div className="mt-8 rounded-xl border bg-white p-5">
        <Bar w={200} h={18} className="mb-4" />
        <div className="h-44 rounded-lg bg-gray-100 animate-pulse" />
      </div>
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="max-w-5xl space-y-4">
      <Bar w={220} h={28} />
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl border bg-white p-4 h-64 animate-pulse bg-gray-50" />
          <div className="rounded-xl border bg-white p-4 h-72 animate-pulse bg-gray-50" />
        </div>
        <div className="space-y-4">
          <div className="rounded-xl border bg-white p-4 h-28 animate-pulse bg-gray-50" />
          <div className="rounded-xl border bg-white p-4 h-40 animate-pulse bg-gray-50" />
        </div>
      </div>
    </div>
  );
}
