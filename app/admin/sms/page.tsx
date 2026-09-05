// SMS feature removed — this route now redirects to the dashboard.
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function AdminSmsRemoved() {
  redirect("/admin");
}
