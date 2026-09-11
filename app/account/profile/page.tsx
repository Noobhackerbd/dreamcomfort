import { redirect } from "next/navigation";
import { getCustomerSession } from "@/lib/customer-auth";
import { DashboardShell } from "@/components/account/DashboardShell";
import { ProfileForm } from "@/components/account/ProfileForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "প্রোফাইল" };

export default async function ProfilePage() {
  const session = await getCustomerSession();
  if (!session) redirect("/account/login");
  const name = session.profile?.name || "";

  return (
    <DashboardShell active="profile" name={name} email={session.email || ""}>
      <div className="mb-5">
        <h1 className="font-display text-2xl font-bold text-gray-900">প্রোফাইল</h1>
        <p className="mt-1 text-sm text-gray-500">আপনার তথ্য আপডেট করুন।</p>
      </div>
      <ProfileForm initialName={name} initialPhone={session.profile?.phone || ""} email={session.email || ""} />
    </DashboardShell>
  );
}
