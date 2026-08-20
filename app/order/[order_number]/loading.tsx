// Instant loading UI for the thank-you route. Next.js shows this the moment
// navigation starts (0ms), while the order page renders on the server — so the
// customer never stares at a frozen screen after placing the order.
export default function Loading() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="pt-2" />
      <div className="rounded-3xl overflow-hidden bg-white shadow-sm ring-1 ring-black/5">
        <div className="border-b border-black/5 px-6 py-8 text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-green-50 ring-1 ring-green-200 flex items-center justify-center">
            <span className="text-3xl text-green-600 font-bold">✓</span>
          </div>
          <h1 className="mt-4 font-display text-2xl md:text-[26px] font-bold text-gray-900">অর্ডার সফলভাবে গৃহীত হয়েছে</h1>
          <p className="mt-3 text-sm text-gray-400">বিস্তারিত লোড হচ্ছে…</p>
          <div className="mt-6 flex justify-center"><span className="dc-dots" /></div>
        </div>
        <div className="p-6 space-y-3">
          <div className="h-16 rounded-2xl bg-gray-100 animate-pulse" />
          <div className="h-16 rounded-2xl bg-gray-100 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
