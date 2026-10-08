// lib/shipping-rules.ts — ONE place that decides what delivery costs.
//
// Shared by the server (checkout, which is the only amount that counts) and the
// browser (what the customer is shown), so the two can never drift apart.
//
// Precedence, highest first:
//   1. The landing page's own charge, when the order came from one that sets it.
//   2. The products' own charges — each item falls back to the global value, then the
//      HIGHEST of those applies once. Buying a ৳70 item with a ৳150 item costs ৳150,
//      never ৳220.
//   3. The global Settings → Shipping value.
//
// Pure functions only: no imports, no server-only code.

export type Area = "inside" | "outside";

/** A per-area delivery charge where null means "no override — fall back". */
export interface AreaFees {
  inside: number | null;
  outside: number | null;
}

/** Read one area off an override, treating anything non-numeric as "no override". */
export function feeForArea(fees: AreaFees | null | undefined, area: Area): number | null {
  if (!fees) return null;
  const v = area === "outside" ? fees.outside : fees.inside;
  return typeof v === "number" && Number.isFinite(v) ? Math.max(0, v) : null;
}

export function pickShippingFee(
  area: Area,
  opts: {
    /** The landing page's charge, when the order came from one. Wins outright. */
    landing?: AreaFees | null;
    /** One entry per product in the order (null fields = use the global value). */
    products?: (AreaFees | null | undefined)[];
    /** Settings → Shipping, the final fallback. */
    global: { inside: number; outside: number };
  }
): number {
  const landing = feeForArea(opts.landing, area);
  if (landing !== null) return landing;

  const globalFee = Math.max(0, area === "outside" ? opts.global.outside : opts.global.inside);
  const per = (opts.products ?? []).map((p) => feeForArea(p, area) ?? globalFee);
  return per.length ? Math.max(...per) : globalFee;
}

/** Normalize whatever the DB/admin hands us into an AreaFees (or null when unset). */
export function toAreaFees(inside: unknown, outside: unknown): AreaFees {
  const n = (v: unknown) => {
    if (v === null || v === undefined || v === "") return null;
    const x = Number(v);
    return Number.isFinite(x) ? Math.max(0, Math.round(x)) : null;
  };
  return { inside: n(inside), outside: n(outside) };
}
