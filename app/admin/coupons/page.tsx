import { getServerSupabase } from "@/lib/supabase/server";
import { CouponManager, type CouponRow } from "./CouponManager";

export const dynamic = "force-dynamic";

export default async function AdminCoupons() {
  const supabase = getServerSupabase();
  const { data, error } = await supabase.from("coupons").select("*").order("created_at", { ascending: false });

  const missing = !!error && ((error as any).code === "42P01" || /coupons/i.test(error.message || ""));

  const rows: CouponRow[] = (data ?? []).map((c: any) => ({
    id: c.id,
    code: c.code,
    type: c.type === "flat" ? "flat" : "percent",
    value: Number(c.value),
    minOrder: Number(c.min_order ?? 0),
    expiresAt: c.expires_at ?? null,
    usageLimit: c.usage_limit ?? null,
    usedCount: Number(c.used_count ?? 0),
    active: !!c.active,
  }));

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Coupons</h1>
      <p className="text-sm dc-muted mb-5">Discount codes for the store checkout. (These don&apos;t apply on the /landing funnel.)</p>

      {missing ? (
        <div className="dc-card p-5 text-sm" style={{ borderColor: "var(--a-warn-soft)", background: "var(--a-warn-soft)", color: "var(--a-warn)" }}>
          To enable coupons, run <code className="bg-white/60 px-1 rounded">supabase-migration-coupons.sql</code> in Supabase → SQL Editor, then refresh.
        </div>
      ) : (
        <CouponManager coupons={rows} />
      )}
    </div>
  );
}
