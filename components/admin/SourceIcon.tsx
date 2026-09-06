// components/admin/SourceIcon.tsx — small brand icon for an order's traffic source.
// Plain (no "use client") so it works in both server and client components.

export type SourceKind =
  | "tiktok" | "facebook" | "google"
  | "whatsapp" | "messenger" | "phone"
  | "direct" | "other";

export function normalizeSource(raw?: string | null): SourceKind {
  const s = (raw || "").toLowerCase();
  if (!s || s === "direct") return "direct";
  if (/tiktok|tt/.test(s)) return "tiktok";
  if (/whatsapp|whats app|wa\.me/.test(s)) return "whatsapp";
  if (/messenger|m\.me|msngr/.test(s)) return "messenger";
  if (/phone|call|ফোন|কল/.test(s)) return "phone";
  if (/facebook|fb|meta|instagram|ig/.test(s)) return "facebook";
  if (/google|gads|adwords/.test(s)) return "google";
  return "other";
}

export const SOURCE_LABEL: Record<SourceKind, string> = {
  tiktok: "TikTok", facebook: "Facebook", google: "Google",
  whatsapp: "WhatsApp", messenger: "Messenger", phone: "Phone",
  direct: "Direct", other: "Other",
};
export const SOURCE_COLOR: Record<SourceKind, string> = {
  tiktok: "#111", facebook: "#1877F2", google: "#EA4335",
  whatsapp: "#25D366", messenger: "#0084FF", phone: "#0891b2",
  direct: "#8a8391", other: "#6d5ae6",
};

export function SourceIcon({ source, size = 15 }: { source?: string | null; size?: number }) {
  const k = normalizeSource(source);
  const title = SOURCE_LABEL[k];
  if (k === "tiktok") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-label={title}><title>{title}</title>
        <path fill="#111" d="M16.5 3c.3 2 1.6 3.5 3.5 3.8v2.5c-1.3 0-2.5-.4-3.6-1.1v6.2a5.6 5.6 0 1 1-5.6-5.6c.3 0 .6 0 .9.1v2.6a3 3 0 1 0 2.1 2.9V3h2.7z"/>
      </svg>
    );
  }
  if (k === "facebook") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-label={title}><title>{title}</title>
        <path fill="#1877F2" d="M22 12a10 10 0 1 0-11.6 9.9v-7h-2.2V12h2.2V10c0-2.2 1.3-3.4 3.3-3.4.96 0 2 .17 2 .17v2.2h-1.1c-1.1 0-1.5.7-1.5 1.4V12h2.5l-.4 2.9h-2.1v7A10 10 0 0 0 22 12z"/>
      </svg>
    );
  }
  if (k === "google") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-label={title}><title>{title}</title>
        <path fill="#4285F4" d="M21.6 12.2c0-.7-.06-1.3-.18-1.9H12v3.6h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.2z"/>
        <path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 .96-3.4.96-2.6 0-4.8-1.75-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22z"/>
        <path fill="#FBBC05" d="M6.4 13.96a6 6 0 0 1 0-3.9V7.46H3.1a10 10 0 0 0 0 9z"/>
        <path fill="#EA4335" d="M12 6.04c1.5 0 2.8.5 3.8 1.5l2.8-2.8A10 10 0 0 0 3.1 7.46l3.3 2.6C7.2 7.8 9.4 6.04 12 6.04z"/>
      </svg>
    );
  }
  if (k === "whatsapp") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-label={title}><title>{title}</title>
        <path fill="#25D366" d="M12 2a10 10 0 0 0-8.5 15.3L2 22l4.8-1.5A10 10 0 1 0 12 2zm5.8 14.2c-.25.7-1.45 1.32-2 1.37-.55.05-1.06.24-3.57-.75-3-1.2-4.9-4.28-5.05-4.48-.15-.2-1.2-1.6-1.2-3.05s.76-2.16 1.03-2.46c.27-.3.59-.37.79-.37l.57.01c.18 0 .43-.07.67.51.25.6.84 2.05.91 2.2.07.15.12.32.02.51-.34.68-.7.65-.4 1.16.82 1.4 1.63 1.88 2.86 2.5.21.1.34.09.46-.05.15-.17.53-.62.67-.83.14-.21.28-.17.47-.1.19.07 1.2.57 1.41.67.21.1.35.15.4.24.05.09.05.53-.2 1.24z"/>
      </svg>
    );
  }
  if (k === "messenger") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-label={title}><title>{title}</title>
        <path fill="#0084FF" d="M12 2C6.3 2 2 6.2 2 11.7c0 2.9 1.18 5.4 3.1 7.12.16.15.26.35.27.57l.05 1.73c.02.55.59.9 1.09.68l1.93-.85c.17-.07.36-.09.54-.04 1 .28 2.05.42 3.02.42 5.7 0 10-4.2 10-9.7S17.7 2 12 2zm6 7.46l-2.93 4.64c-.47.74-1.47.93-2.17.4l-2.33-1.75a.6.6 0 0 0-.72 0l-3.15 2.39c-.42.32-.97-.18-.69-.63l2.93-4.64c.47-.74 1.47-.93 2.17-.4l2.33 1.75c.21.16.5.16.72 0l3.15-2.39c.42-.32.97.18.69.63z"/>
      </svg>
    );
  }
  if (k === "phone") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-label={title}><title>{title}</title>
        <path fill="#0891b2" d="M6.62 10.79a15.5 15.5 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.02-.24c1.12.37 2.33.57 3.57.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.24.2 2.45.57 3.57a1 1 0 0 1-.24 1.02l-2.2 2.2z"/>
      </svg>
    );
  }
  if (k === "direct") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#8a8391" strokeWidth="1.8" aria-label={title}><title>{title}</title>
        <circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/>
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#6d5ae6" strokeWidth="1.8" aria-label={title}><title>{title}</title>
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V4s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7"/>
    </svg>
  );
}
