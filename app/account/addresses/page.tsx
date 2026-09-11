import { redirect } from "next/navigation";
import { getCustomerSession } from "@/lib/customer-auth";
import { listAddresses } from "../address-actions";
import { DashboardShell } from "@/components/account/DashboardShell";
import { AddressManager } from "@/components/account/AddressManager";

export const dynamic = "force-dynamic";
export const metadata = { title: "ঠিকানা" };

export default async function AddressesPage() {
  const session = await getCustomerSession();
  if (!session) redirect("/account/login");
  const { addresses } = await listAddresses();
  const name = session.profile?.name || "";

  return (
    <DashboardShell active="addresses" name={name} email={session.email || ""}>
      <div className="mb-5">
        <h1 className="font-display text-2xl font-bold text-gray-900">সেভ করা ঠিকানা</h1>
        <p className="mt-1 text-sm text-gray-500">দ্রুত চেকআউটের জন্য ঠিকানা সেভ করুন।</p>
      </div>
      <AddressManager initial={addresses} />
    </DashboardShell>
  );
}
