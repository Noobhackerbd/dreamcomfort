// Instant skeleton shown while a product page loads (prefetched by <Link>).
export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="h-4 w-44 bg-black/5 rounded mb-4" />
      <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
        <div className="aspect-square rounded-2xl bg-black/5" />
        <div className="space-y-4">
          <div className="h-7 w-3/4 bg-black/5 rounded" />
          <div className="h-4 w-1/3 bg-black/5 rounded" />
          <div className="h-9 w-1/2 bg-black/5 rounded" />
          <div className="h-20 w-full bg-black/5 rounded" />
          <div className="h-12 w-full bg-black/10 rounded-xl" />
          <div className="grid grid-cols-3 gap-2.5">
            <div className="h-16 bg-black/5 rounded-lg" />
            <div className="h-16 bg-black/5 rounded-lg" />
            <div className="h-16 bg-black/5 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
