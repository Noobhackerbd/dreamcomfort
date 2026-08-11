"use server";

// Abandoned-cart capture. Called (debounced) from the storefront order form as
// the visitor types, so partial fills are saved even if they never submit.
// Runs with the service-role client, so the public never touches the table directly.

import { getServerSupabase } from "@/lib/supabase/server";

export interface AbandonedLeadInput {
  leadId: string;
  name?: string;
  phone?: string;
  address?: string;
  area?: string;
  productId?: string;
  productName?: string;
  quantity?: number;
  value?: number;
}

/** Upsert a partial lead by its stable client id. Never throws to the caller. */
export async function saveAbandonedLead(input: AbandonedLeadInput): Promise<{ ok: boolean }> {
  try {
    const leadId = (input.leadId || "").trim();
    if (!leadId) return { ok: false };

    const name = (input.name || "").trim();
    const phone = (input.phone || "").trim();
    const address = (input.address || "").trim();

    // Only store once there's something worth following up on.
    const meaningful = phone.replace(/\D/g, "").length >= 6 || (name.length >= 2 && address.length >= 4);
    if (!meaningful) return { ok: false };

    const supabase = getServerSupabase();
    // Note: `status` is intentionally omitted so a previously converted lead
    // is never flipped back to abandoned on a later keystroke.
    const { error } = await supabase
      .from("abandoned_carts")
      .upsert(
        {
          lead_id: leadId,
          customer_name: name || null,
          customer_phone: phone || null,
          address_line: address || null,
          area: (input.area || "").trim() || null,
          product_id: input.productId || null,
          product_name: input.productName || null,
          quantity: Math.max(1, Math.floor(Number(input.quantity) || 1)),
          value: Math.max(0, Number(input.value) || 0),
        },
        { onConflict: "lead_id" }
      );
    if (error) return { ok: false };
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

/** Mark a lead as converted once its order is placed. Best-effort. */
export async function markLeadConverted(leadId: string, orderId: string, orderNumber: string): Promise<void> {
  try {
    if (!leadId) return;
    const supabase = getServerSupabase();
    await supabase
      .from("abandoned_carts")
      .update({ status: "converted", order_id: orderId, order_number: orderNumber })
      .eq("lead_id", leadId);
  } catch {
    /* never block the order */
  }
}
