// lib/format.ts — plain (server + client safe) formatting helpers.
// NOTE: this file has no "use client" directive on purpose, so server components
// can import and CALL these functions directly. Do not move `taka` back into the
// client-only cart store, or server components will get a client-reference stub.

/** Format a number as a Bangla-friendly Taka string. */
export function taka(amount: number): string {
  return "৳" + Number(amount).toLocaleString("en-BD");
}

// ---------------------------------------------------------------------------
// Bangladesh time helpers. BD is UTC+6 year-round (no daylight saving), so we
// use a fixed +06:00 offset — safe on both server and client without any TZ db.
// ---------------------------------------------------------------------------
const BD_OFFSET_MIN = 6 * 60;

/** Pretty BD date + time, e.g. "10 Aug 2026, 2:24 PM". */
export function bdDateTime(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Dhaka",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

/** Short BD date only, e.g. "10 Aug 2026". */
export function bdDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Dhaka",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

/** BD time only, e.g. "2:24 PM". */
export function bdTime(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Dhaka",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

/** UTC ISO → "YYYY-MM-DDTHH:mm" in BD local time, for a <input type="datetime-local">. */
export function toBdInputValue(iso?: string | null): string {
  const d = iso ? new Date(iso) : new Date();
  if (isNaN(d.getTime())) return "";
  const shifted = new Date(d.getTime() + BD_OFFSET_MIN * 60_000);
  return shifted.toISOString().slice(0, 16); // drop seconds + Z
}

/** "YYYY-MM-DDTHH:mm" (interpreted as BD local) → UTC ISO string. */
export function bdInputValueToIso(local: string): string | null {
  if (!local) return null;
  // Append the fixed BD offset so Date parses it as Asia/Dhaka wall-clock time.
  const d = new Date(local.length === 16 ? `${local}:00+06:00` : `${local}+06:00`);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}
