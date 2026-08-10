"use client";

import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/ssr-browser";

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await getSupabaseBrowserClient().auth.signOut();
        router.push("/admin/login");
        router.refresh();
      }}
      className="text-sm text-red-600 hover:underline"
    >
      লগআউট
    </button>
  );
}
