// components/Breadcrumbs.tsx — accessible breadcrumb trail + BreadcrumbList JSON-LD (SEO).

import { T } from "@/components/i18n/T";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://dreamcomfortbd.com";

// `name` is the default (Bengali) label, also used for SEO JSON-LD; `nameEn` (optional)
// is shown when the visitor has English selected.
export function Breadcrumbs({ items }: { items: { name: string; nameEn?: string; href: string }[] }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: it.href.startsWith("http") ? it.href : `${SITE}${it.href}`,
    })),
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav aria-label="Breadcrumb" className="mb-4">
        <ol className="flex items-center gap-1.5 text-[13px] text-gray-500 flex-wrap">
          {items.map((it, i) => {
            const last = i === items.length - 1;
            return (
              <li key={it.href} className="flex items-center gap-1.5 min-w-0">
                {last ? (
                  <span className="text-gray-700 font-medium truncate max-w-[220px]" aria-current="page">{it.nameEn ? <T en={it.nameEn} bn={it.name} /> : it.name}</span>
                ) : (
                  <a href={it.href} className="hover:text-brand truncate">{it.nameEn ? <T en={it.nameEn} bn={it.name} /> : it.name}</a>
                )}
                {!last && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5 text-gray-300 shrink-0"><path d="M9 6l6 6-6 6" /></svg>}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
