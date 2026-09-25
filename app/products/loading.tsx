// Instant skeleton for the product listing (prefetched by <Link>).
export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="h-6 w-40 bg-black/5 rounded mb-4" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-md border border-black/[0.07] overflow-hidden bg-white">
            <div className="aspect-square bg-black/5" />
            <div className="p-2.5 space-y-2">
              <div className="h-3 w-full bg-black/5 rounded" />
              <div className="h-3 w-2/3 bg-black/5 rounded" />
              <div className="h-4 w-1/2 bg-black/10 rounded mt-1" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
