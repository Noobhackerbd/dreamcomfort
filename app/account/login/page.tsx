import { redirect } from "next/navigation";
import { getCustomerSession } from "@/lib/customer-auth";
import { AuthPanel } from "@/components/account/AuthPanel";

export const dynamic = "force-dynamic";
export const metadata = { title: "Log In" };

export default async function LoginPage() {
  const session = await getCustomerSession();
  if (session) redirect("/account");
  return <AuthPanel mode="login" />;
}
