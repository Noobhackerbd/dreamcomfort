// lib/format.ts — plain (server + client safe) formatting helpers.
// NOTE: this file has no "use client" directive on purpose, so server components
// can import and CALL these functions directly. Do not move `taka` back into the
// client-only cart store, or server components will get a client-reference stub.

/** Format a number as a Bangla-friendly Taka string. */
export function taka(amount: number): string {
  return "৳" + Number(amount).toLocaleString("en-BD");
}
