// lib/meta/hash.ts
// SHA-256 hashing + normalization for Meta Advanced Matching.
// Meta requires PII (email, phone, name, city, etc.) to be lowercased, trimmed,
// and SHA-256 hashed (hex) BEFORE it is sent to the Conversions API.
// fbp / fbc / IP / user-agent are NOT hashed.

import crypto from "crypto";

function sha256(input: string): string {
  return crypto.createHash("sha256").update(input, "utf8").digest("hex");
}

/** Hash a generic PII string: trim + lowercase + sha256. Returns undefined for empty. */
export function hashField(value?: string | null): string | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return undefined;
  return sha256(normalized);
}

/**
 * Normalize a Bangladeshi phone to E.164 digits (8801XXXXXXXXX) then hash.
 * Accepts 01XXXXXXXXX, +8801XXXXXXXXX, 8801XXXXXXXXX, with spaces/dashes.
 */
export function hashPhone(raw?: string | null): string | undefined {
  if (!raw) return undefined;
  let digits = raw.replace(/\D/g, ""); // keep digits only
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = "88" + digits;      // 017... -> 88017...
  else if (digits.startsWith("1")) digits = "880" + digits; // 17...  -> 88017...
  else if (!digits.startsWith("880")) digits = "880" + digits;
  if (digits.length < 12) return undefined;
  return sha256(digits);
}

/** Normalize + hash the raw phone WITHOUT hashing — used for external_id fallback we then hash. */
export function normalizeBdPhone(raw?: string | null): string | undefined {
  if (!raw) return undefined;
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = "88" + digits;
  else if (digits.startsWith("1")) digits = "880" + digits;
  else if (!digits.startsWith("880")) digits = "880" + digits;
  return digits.length >= 12 ? digits : undefined;
}

export interface RawUserData {
  email?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  city?: string | null;
  state?: string | null;   // district
  zip?: string | null;
  externalId?: string | null; // e.g. customer id or phone
}

/** Build the hashed portion of Meta user_data from raw customer info.
 * NOTE: external_id is sent PLAIN (not hashed) so it exactly matches the value
 * the browser Pixel sends via advanced matching — the Pixel does not hash
 * external_id, so hashing it here would break browser↔server identity matching. */
export function buildHashedUserData(u: RawUserData) {
  return {
    em: hashField(u.email),
    ph: hashPhone(u.phone),
    fn: hashField(u.firstName),
    ln: hashField(u.lastName),
    ct: hashField(u.city),
    st: hashField(u.state),
    zp: hashField(u.zip),
    country: hashField("bd"),
    external_id: u.externalId || undefined, // plain, must equal the browser value
  };
}
