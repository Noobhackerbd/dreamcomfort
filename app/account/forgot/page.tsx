import { AuthPanel } from "@/components/account/AuthPanel";

export const dynamic = "force-dynamic";
export const metadata = { title: "পাসওয়ার্ড রিসেট" };

export default function ForgotPage() {
  return <AuthPanel mode="forgot" />;
}
