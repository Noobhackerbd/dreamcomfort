import { redirect } from "next/navigation";
import { getCustomerSession } from "@/lib/customer-auth";
import { getAvailableCoupons } from "../coupon-actions";
import { DashboardShell } from "@/components/account/DashboardShell";
import { CouponsGrid } from "@/components/account/CouponsGrid";

export const dynamic = "force-dynamic";
export const metadata = { title: "কুপন" };

export default async function CouponsPage() {
  const session = await getCustomerSession();
  if (!session) redirect("/account/login");
  const { coupons } = await getAvailableCoupons();
  const name = session.profile?.name || "";

  return (
    <DashboardShell active="coupons" name={name} email={session.email || ""}>
      <div className="mb-5">
        <h1 className="font-display text-2xl font-bold text-gray-900">কুপন</h1>
        <p className="mt-1 text-sm text-gray-500">চেকআউটে কোড দিয়ে ছাড় নিন।</p>
      </div>
      <CouponsGrid coupons={coupons} />
    </DashboardShell>
  );
}
