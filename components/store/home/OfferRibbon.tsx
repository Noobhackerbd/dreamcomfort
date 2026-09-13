// OfferRibbon — one strategic, premium offer. Framed as a benefit (a small gift),
// never as desperation. Server component. Free home delivery reflects the store's
// current shipping settings.

export function OfferRibbon() {
  return (
    <section className="bg-ivory">
      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-r from-blush-soft via-ivory to-beige-soft ring-1 ring-ink/[0.05] px-6 sm:px-10 py-8 sm:py-9">
          <div aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-48 w-48 sc-blob bg-blush-light/50 blur-xl" />
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
            <div className="max-w-md">
              <p className="sc-serif italic text-blush-deep text-lg">A small gift —</p>
              <h3 className="mt-1 font-sans font-bold text-ink text-[22px] sm:text-[26px] leading-tight">
                একটি ছোট্ট উপহার,<br className="hidden sm:block" /> মায়ের জন্য একটু বেশি আরাম।
              </h3>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="grid place-items-center h-14 w-14 rounded-full bg-white shadow-card mx-auto">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#E1809A" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M1 3h15v13H1zM16 8h4l3 3v5h-7M5.5 18.5a2.5 2.5 0 105 0M18.5 18.5a2.5 2.5 0 105 0" /></svg>
                </div>
                <p className="mt-2 text-[13px] font-bold text-ink leading-tight">ফ্রি হোম<br />ডেলিভারি</p>
              </div>
              <a href="/products" className="sc-btn rounded-full px-7 py-3.5 text-[15px] font-bold whitespace-nowrap">শপ করুন</a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
