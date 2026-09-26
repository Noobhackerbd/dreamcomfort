import { redirect } from "next/navigation";
import { getCustomerSession } from "@/lib/customer-auth";
import { AuthPanel } from "@/components/account/AuthPanel";

export const dynamic = "force-dynamic";
export const metadata = { title: "Create Account" };

export default async function RegisterPage() {
  const session = await getCustomerSession();
  if (session) redirect("/account");
  return <AuthPanel mode="register" />;
}
