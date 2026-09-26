"use client";

import { useLang, useSetLang } from "@/components/i18n/I18nProvider";

/** English / বাংলা toggle. Used in the mobile menu drawer and can be placed anywhere. */
export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const lang = useLang();
  const setLang = useSetLang();
  const opts: { key: "en" | "bn"; label: string }[] = [
    { key: "en", label: "English" },
    { key: "bn", label: "বাংলা" },
  ];
  return (
    <div className={"inline-flex items-center rounded-full bg-black/[0.05] p-0.5 " + className} role="group" aria-label="Language">
      {opts.map((o) => {
        const active = lang === o.key;
        return (
          <button
            key={o.key}
            onClick={() => { if (!active) setLang(o.key); }}
            className={"px-3.5 py-1.5 text-[12.5px] font-semibold rounded-full transition " + (active ? "bg-white text-brand-dark shadow-sm" : "text-gray-500 hover:text-gray-700")}
            aria-pressed={active}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
