"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";

function waLink(phone: string): string {
  let n = (phone || "").replace(/\D/g, "");
  if (n.startsWith("00")) n = n.slice(2);
  if (n.startsWith("0")) n = "88" + n; else if (n.startsWith("1")) n = "880" + n; else if (!n.startsWith("880")) n = "880" + n;
  return "https://wa.me/" + n;
}

export function SupportFab({ phone, facebook }: { phone?: string; facebook?: string }) {
  const pathname = usePathname() || "/";
  const [open, setOpen] = useState(false);

  // Non-intrusive: never on admin, order confirmation, landing funnel or checkout.
  if (/^\/(admin|order|landing|checkout|worker)(\/|$)/.test(pathname)) return null;

  const items = [
    facebook ? { label: "Messenger", href: facebook, bg: "#0084FF", icon: (<path fill="#fff" d="M12 2C6.3 2 2 6.2 2 11.7c0 2.9 1.18 5.4 3.1 7.12V22l2.9-1.6c.9.25 1.85.4 2.99.4 5.7 0 10-4.2 10-9.7S17.7 2 12 2zm1 13l-2.5-2.7L5.7 15l5.3-5.6 2.6 2.7 4.7-2.7L13 15z" />) } : null,
    phone ? { label: "WhatsApp", href: waLink(phone), bg: "#25D366", icon: (<path fill="#fff" d="M12 2a10 10 0 0 0-8.5 15.3L2 22l4.8-1.5A10 10 0 1 0 12 2zm5.8 14.2c-.25.7-1.45 1.32-2 1.37-.55.05-1.06.24-3.57-.75-3-1.2-4.9-4.28-5.05-4.48-.15-.2-1.2-1.6-1.2-3.05s.76-2.16 1.03-2.46c.27-.3.59-.37.79-.37h.57c.18 0 .43-.07.67.51.25.6.84 2.05.91 2.2.07.15.12.32.02.51-.34.68-.7.65-.4 1.16.82 1.4 1.63 1.88 2.86 2.5.3.15.46.12.62-.07.16-.19.7-.8.88-1.08.18-.28.36-.23.61-.14.25.09 1.6.75 1.87.89.21.1.35.15.4.24.05.09.05.53-.2 1.24z" />) } : null,
    { label: "সাহায্য কেন্দ্র", href: "/help", bg: "#3E9BD1", icon: (<path fill="none" stroke="#fff" strokeWidth="1.9" d="M9.1 9a3 3 0 1 1 4.2 2.7c-.8.4-1.3 1-1.3 2M12 17h.01" />) },
  ].filter(Boolean) as { label: string; href: string; bg: string; icon: JSX.Element }[];

  return (
    <div className="fixed right-4 z-[70]" style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 76px)" }}>
      {/* expanding actions */}
      <div className={"flex flex-col items-end gap-2.5 mb-2.5 transition-all duration-200 " + (open ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-2 pointer-events-none")}>
        {items.map((it) => (
          <a key={it.label} href={it.href} target={it.href.startsWith("http") ? "_blank" : undefined} rel="noopener"
            className="flex items-center gap-2 group">
            <span className="rounded-full bg-white text-gray-800 text-[13px] font-medium px-3 py-1.5 shadow-md ring-1 ring-black/5 whitespace-nowrap">{it.label}</span>
            <span className="h-11 w-11 rounded-full grid place-items-center shadow-lg" style={{ background: it.bg }}>
              <svg viewBox="0 0 24 24" className="h-6 w-6">{it.icon}</svg>
            </span>
          </a>
        ))}
      </div>

      {/* main button */}
      <button onClick={() => setOpen((v) => !v)} aria-label="Support"
        className="ml-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand text-white shadow-xl hover:bg-brand-dark active:scale-95 transition">
        {open ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-6 w-6"><path d="M6 6l12 12M18 6L6 18" /></svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className="h-7 w-7"><path d="M21 15a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2z" /></svg>
        )}
      </button>
    </div>
  );
}
