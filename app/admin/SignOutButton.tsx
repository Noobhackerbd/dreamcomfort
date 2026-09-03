"use client";

import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/ssr-browser";
import { Icon } from "@/components/admin/icons";

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await getSupabaseBrowserClient().auth.signOut();
        router.push("/admin/login");
        router.refresh();
      }}
      className="dc-iconbtn inline-flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm"
      title="Sign out"
    >
      <Icon name="logout" className="h-4 w-4" />
      <span>Logout</span>
    </button>
  );
}
