// MotherStories — beat 06. Social proof as editorial, built ONLY from real
// approved reviews (passed in from the DB). If there are none, the parent simply
// doesn't render this section — we never fabricate testimonials.

type Review = {
  id: string;
  name: string | null;
  rating: number;
  body: string | null;
  products?: { name_bn?: string | null; name_en?: string | null; slug?: string | null } | null;
};

function Stars({ n }: { n: number }) {
  return <span className="text-blush tracking-wide text-[13px]" aria-label={`${n} star`}>{"★".repeat(Math.max(0, Math.min(5, n)))}<span className="text-beige">{"★".repeat(5 - Math.max(0, Math.min(5, n)))}</span></span>;
}

function Avatar({ name }: { name: string }) {
  return (
    <span className="grid place-items-center h-10 w-10 rounded-full bg-blush-soft text-blush-deep text-[15px] font-bold shrink-0">
      {(name || "?").charAt(0).toUpperCase()}
    </span>
  );
}

export function MotherStories({ reviews }: { reviews: Review[] }) {
  const withBody = reviews.filter((r) => (r.body || "").trim().length > 0);
  if (withBody.length === 0) return null;

  // Feature = the most substantial review; supporting = the next few.
  const sorted = [...withBody].sort((a, b) => (b.body || "").length - (a.body || "").length);
  const feature = sorted[0];
  const supporting = withBody.filter((r) => r.id !== feature.id).slice(0, 4);

  const prodName = (r: Review) => r.products ? (r.products.name_bn || r.products.name_en || "") : "";

  return (
    <section className="bg-blush-mist">
      <div className="mx-auto max-w-6xl px-5 sm:px-6 py-16 sm:py-20">
        <div className="max-w-xl">
          <p className="sc-eyebrow text-blush-deep">০৬ — প্রকৃত অভিজ্ঞতা</p>
          <h2 className="mt-3 font-sans font-bold text-ink text-[26px] sm:text-[32px] leading-tight">Mothers of Dream Comfort</h2>
          <p className="mt-2 text-ink-muted text-[14.5px]">যাচাইকৃত ক্রেতাদের নিজের ভাষায় বলা গল্প।</p>
        </div>

        <div className="mt-9 grid lg:grid-cols-2 gap-4 sm:gap-5">
          {/* Feature story */}
          <figure className="rounded-[32px] bg-white p-7 sm:p-9 shadow-card ring-1 ring-ink/[0.05] flex flex-col">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="#F4ABBD" aria-hidden><path d="M7 7h4v4c0 3-1.5 5-4 6v-2c1.2-.6 2-1.6 2-3H7zM15 7h4v4c0 3-1.5 5-4 6v-2c1.2-.6 2-1.6 2-3h-2z" /></svg>
            <blockquote className="mt-4 font-sans text-ink text-[19px] sm:text-[22px] leading-relaxed flex-1">
              “{feature.body}”
            </blockquote>
            <figcaption className="mt-6 flex items-center gap-3">
              <Avatar name={feature.name || "গ্রাহক"} />
              <div>
                <p className="text-[14px] font-bold text-ink leading-tight">{feature.name || "গ্রাহক"}</p>
                <p className="text-[12px] text-ink-muted flex items-center gap-1.5">
                  <Stars n={feature.rating} />
                  <span className="inline-flex items-center gap-1 text-green-600">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                    যাচাইকৃত ক্রয়
                  </span>
                </p>
              </div>
            </figcaption>
          </figure>

          {/* Supporting */}
          <div className="grid sm:grid-cols-2 gap-4 sm:gap-5 content-start">
            {supporting.map((r) => (
              <figure key={r.id} className="rounded-3xl bg-white/70 backdrop-blur p-5 ring-1 ring-ink/[0.05]">
                <Stars n={r.rating} />
                <blockquote className="mt-2 text-[13.5px] text-ink-soft leading-relaxed line-clamp-5">“{r.body}”</blockquote>
                <figcaption className="mt-3 flex items-center gap-2.5">
                  <Avatar name={r.name || "গ্রাহক"} />
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold text-ink leading-tight truncate">{r.name || "গ্রাহক"}</p>
                    {prodName(r) && (
                      r.products?.slug
                        ? <a href={`/product/${r.products.slug}`} className="text-[11px] text-ink-muted hover:text-blush-deep truncate block">{prodName(r)}</a>
                        : <span className="text-[11px] text-ink-muted truncate block">{prodName(r)}</span>
                    )}
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
