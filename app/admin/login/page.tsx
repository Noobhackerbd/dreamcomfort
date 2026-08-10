"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/ssr-browser";
import { STORE_NAME } from "@/lib/config";

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search.includes("denied=1")) {
      setError("এই অ্যাকাউন্টের অ্যাডমিন অনুমতি নেই।");
    }
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError("ভুল ইমেইল বা পাসওয়ার্ড।");
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-2xl border bg-white p-6 shadow-sm"
      >
        <h1 className="text-xl font-bold text-center">{STORE_NAME} — অ্যাডমিন</h1>
        <p className="text-center text-sm text-gray-500 mt-1 mb-5">লগইন করুন</p>

        <label className="block text-sm mb-1">ইমেইল</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border px-4 py-2.5 mb-3 outline-none focus:border-brand"
          placeholder="admin@example.com"
        />

        <label className="block text-sm mb-1">পাসওয়ার্ড</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border px-4 py-2.5 mb-4 outline-none focus:border-brand"
          placeholder="••••••••"
        />

        {error && (
          <p className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-3 py-2 text-sm mb-3">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-brand text-white px-4 py-2.5 font-medium hover:bg-brand-dark disabled:opacity-60"
        >
          {loading ? "লগইন হচ্ছে..." : "লগইন"}
        </button>
      </form>
    </div>
  );
}
