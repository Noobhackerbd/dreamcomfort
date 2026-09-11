import { redirect } from "next/navigation";
import { getCustomerSession } from "@/lib/customer-auth";
import { DashboardShell } from "@/components/account/DashboardShell";
import { RecentGrid } from "@/components/account/RecentGrid";

export const dynamic = "force-dynamic";
export const metadata = { title: "সম্প্রতি দেখা" };

export default async function RecentPage() {
  const session = await getCustomerSession();
  if (!session) redirect("/account/login");
  const name = session.profile?.name || "";

  return (
    <DashboardShell active="recent" name={name} email={session.email || ""}>
      <div className="mb-5">
        <h1 className="font-display text-2xl font-bold text-gray-900">সম্প্রতি দেখা পণ্য</h1>
        <p className="mt-1 text-sm text-gray-500">আপনি যে পণ্যগুলো দেখেছেন।</p>
      </div>
      <RecentGrid />
    </DashboardShell>
  );
}
