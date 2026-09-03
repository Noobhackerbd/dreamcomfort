// Shared admin loading skeletons (shown by route-level loading.tsx during data fetch).
// Uses the design-system .dc-skeleton (theme-aware shimmer) and .dc-card tokens.

export function Bar({ w = "100%", h = 14, className = "" }: { w?: string | number; h?: number; className?: string }) {
  return (
    <div
      className={"dc-skeleton " + className}
      style={{ width: typeof w === "number" ? `${w}px` : w, height: h }}
    />
  );
}

export function CardRowSkeleton() {
  return (
    <div className="dc-card p-3.5">
      <div className="flex items-start gap-3">
        <div className="dc-skeleton h-12 w-12 shrink-0" />
        <div className="flex-1 space-y-2">
          <Bar w={140} h={15} />
          <Bar w="65%" />
          <Bar w="45%" />
          <div className="pt-2 mt-1 flex gap-2">
            <Bar w={90} h={26} />
            <Bar w={120} h={26} />
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
      <div className="space-y-2.5">
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
          <div key={i} className="dc-card p-5 space-y-3">
            <Bar w="60%" h={12} />
            <Bar w="40%" h={22} />
          </div>
        ))}
      </div>
      <div className="mt-8 dc-card p-5">
        <Bar w={200} h={18} className="mb-4" />
        <div className="dc-skeleton h-44" />
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
          <div className="dc-card p-4"><div className="dc-skeleton h-56" /></div>
          <div className="dc-card p-4"><div className="dc-skeleton h-64" /></div>
        </div>
        <div className="space-y-4">
          <div className="dc-card p-4"><div className="dc-skeleton h-24" /></div>
          <div className="dc-card p-4"><div className="dc-skeleton h-36" /></div>
        </div>
      </div>
    </div>
  );
}
