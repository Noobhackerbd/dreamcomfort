"use server";

import { getServerSupabase } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin-auth";

export interface SearchOrder {
  id: string; order_number: string; name: string; phone: string; total: number; status: string; image: string | null;
}
export interface SearchProduct {
  id: string; slug: string; name: string; price: number; stock: number; image: string | null;
}
export interface SearchCustomer {
  id: string; name: string; phone: string; orders: number; spent: number;
}
export interface SearchResults {
  orders: SearchOrder[]; products: SearchProduct[]; customers: SearchCustomer[];
}

/** Instant admin search across orders, products and customers. */
export async function globalSearch(query: string): Promise<SearchResults> {
  await requireAdmin();
  const raw = (query || "").trim();
  const empty: SearchResults = { orders: [], products: [], customers: [] };
  if (raw.length < 2) return empty;

  // Sanitize for a PostgREST or() filter (commas/parens/percent break the grammar).
  const s = raw.replace(/[,()%*]/g, " ").trim();
  if (!s) return empty;
  const like = `%${s}%`;

  const supabase = getServerSupabase();

  async function findOrders(): Promise<SearchOrder[]> {
    const cols = "id, order_number, customer_name, customer_phone, total, status, order_items(product_name, products(images))";
    const build = (withDel: boolean) => {
      let q = supabase.from("orders").select(cols).or(`order_number.ilike.${like},customer_phone.ilike.${like},customer_name.ilike.${like}`).order("created_at", { ascending: false }).limit(6);
      if (withDel) q = q.is("deleted_at", null);
      return q;
    };
    let res = await build(true);
    if (res.error && ((res.error as any).code === "42703" || /deleted_at/i.test(res.error.message || ""))) res = await build(false);
    if (res.error) return [];
    return (res.data ?? []).map((o: any) => ({
      id: o.id,
      order_number: o.order_number,
      name: o.customer_name ?? "",
      phone: o.customer_phone ?? "",
      total: Number(o.total ?? 0),
      status: o.status,
      image: o.order_items?.[0]?.products?.images?.[0] ?? null,
    }));
  }

  async function findProducts(): Promise<SearchProduct[]> {
    const res = await supabase
      .from("products")
      .select("id, slug, name_bn, name_en, price, stock, images")
      .or(`name_bn.ilike.${like},name_en.ilike.${like},slug.ilike.${like}`)
      .limit(6);
    if (res.error) return [];
    return (res.data ?? []).map((p: any) => ({
      id: p.id, slug: p.slug ?? "", name: p.name_bn || p.name_en || "Untitled",
      price: Number(p.price ?? 0), stock: Number(p.stock ?? 0), image: p.images?.[0] ?? null,
    }));
  }

  async function findCustomers(): Promise<SearchCustomer[]> {
    const res = await supabase
      .from("customers")
      .select("id, name, phone, total_orders, total_spent")
      .or(`name.ilike.${like},phone.ilike.${like}`)
      .order("total_spent", { ascending: false })
      .limit(6);
    if (res.error) return [];
    return (res.data ?? []).map((c: any) => ({
      id: c.id, name: c.name ?? "", phone: c.phone ?? "",
      orders: Number(c.total_orders ?? 0), spent: Number(c.total_spent ?? 0),
    }));
  }

  const [orders, products, customers] = await Promise.all([findOrders(), findProducts(), findCustomers()]);
  return { orders, products, customers };
}
