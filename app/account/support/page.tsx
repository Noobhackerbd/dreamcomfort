import { redirect } from "next/navigation";
import { getCustomerSession } from "@/lib/customer-auth";
import { listMyTickets } from "../support-actions";
import { DashboardShell } from "@/components/account/DashboardShell";
import { SupportPanel } from "@/components/account/SupportPanel";

export const dynamic = "force-dynamic";
export const metadata = { title: "সাপোর্ট" };

export default async function SupportPage() {
  const session = await getCustomerSession();
  if (!session) redirect("/account/login");
  const { tickets } = await listMyTickets();
  const name = session.profile?.name || "";

  return (
    <DashboardShell active="support" name={name} email={session.email || ""}>
      <div className="mb-5">
        <h1 className="font-display text-2xl font-bold text-gray-900">সাপোর্ট</h1>
        <p className="mt-1 text-sm text-gray-500">সাহায্য দরকার? টিকিট খুলুন — আমরা উত্তর দেব।</p>
      </div>
      <SupportPanel initial={tickets} defaultName={name} defaultPhone={session.profile?.phone || ""} />
    </DashboardShell>
  );
}
