import { redirect } from "next/navigation";
import { getCustomerSession } from "@/lib/customer-auth";
import { getWishlistProducts } from "../wishlist-actions";
import { DashboardShell } from "@/components/account/DashboardShell";
import { WishlistMerge } from "@/components/account/WishlistMerge";
import { ProductCard } from "@/components/ProductCard";

export const dynamic = "force-dynamic";
export const metadata = { title: "উইশলিস্ট" };

export default async function WishlistPage() {
  const session = await getCustomerSession();
  if (!session) redirect("/account/login");
  const { products } = await getWishlistProducts();
  const name = session.profile?.name || "";

  return (
    <DashboardShell active="wishlist" name={name} email={session.email || ""}>
      <WishlistMerge />
      <div className="mb-5">
        <h1 className="font-display text-2xl font-bold text-gray-900">উইশলিস্ট</h1>
        <p className="mt-1 text-sm text-gray-500">{products.length} টি পণ্য সেভ করা</p>
      </div>

      {products.length === 0 ? (
        <div className="rounded-3xl bg-white ring-1 ring-black/5 shadow-sm px-5 py-14 text-center">
          <p className="text-gray-500">উইশলিস্ট খালি — ❤️ আইকনে ট্যাপ করে পণ্য সেভ করুন।</p>
          <a href="/products" className="mt-3 inline-block rounded-xl bg-brand text-white px-5 py-2.5 text-sm font-semibold hover:bg-brand-dark">পণ্য দেখুন</a>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {products.map((p: any) => <ProductCard key={p.id} p={p} />)}
        </div>
      )}
    </DashboardShell>
  );
}
