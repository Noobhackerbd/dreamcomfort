"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginCustomer, registerCustomer, forgotPassword } from "@/app/account/actions";
import { useL } from "@/components/i18n/I18nProvider";

type Mode = "login" | "register" | "forgot";

export function AuthPanel({ mode }: { mode: Mode }) {
  const { L } = useL();
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const input = "w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-[15px] outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 transition";
  const label = "block text-[13px] font-medium text-gray-600 mb-1.5";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setOk(null); setBusy(true);
    try {
      if (mode === "login") {
        const res = await loginCustomer({ email, password });
        if (!res.ok) { setErr(res.error ?? L("Login failed.","লগইন ব্যর্থ।")); return; }
        router.replace("/account"); router.refresh();
      } else if (mode === "register") {
        const res = await registerCustomer({ name, phone, email, password });
        if (!res.ok) { setErr(res.error ?? L("Registration failed.","রেজিস্ট্রেশন ব্যর্থ।")); return; }
        if (res.needsVerify) { setOk(L("Account created! Verify via the link sent to your email, then log in.","অ্যাকাউন্ট তৈরি হয়েছে! ইমেইলে পাঠানো লিংক দিয়ে ভেরিফাই করে লগইন করুন।")); return; }
        router.replace("/account"); router.refresh();
      } else {
        const res = await forgotPassword(email);
        if (!res.ok) { setErr(res.error ?? L("Failed.","ব্যর্থ।")); return; }
        setOk(L("A password reset link has been sent to your email.","পাসওয়ার্ড রিসেট লিংক আপনার ইমেইলে পাঠানো হয়েছে।"));
      }
    } finally { setBusy(false); }
  }

  const title = mode === "login" ? L("Log In","লগইন করুন") : mode === "register" ? L("Create Account","অ্যাকাউন্ট তৈরি করুন") : L("Reset Password","পাসওয়ার্ড রিসেট");
  const sub = mode === "login" ? L("Log in to see your orders, tracking and more.","আপনার অর্ডার, ট্র্যাকিং ও আরও দেখতে লগইন করুন।") : mode === "register" ? L("Create one and keep all your orders in one place.","একবার তৈরি করলে সব অর্ডার এক জায়গায় পাবেন।") : L("Enter your email — a reset link will be sent.","ইমেইল দিন — রিসেট লিংক পাঠানো হবে।");

  return (
    <div className="min-h-[70vh] grid place-items-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="font-display text-[26px] font-bold text-gray-900">{title}</h1>
          <p className="mt-1.5 text-sm text-gray-500">{sub}</p>
        </div>

        <form onSubmit={submit} className="rounded-3xl bg-white ring-1 ring-black/5 shadow-sm p-6 space-y-4">
          {mode === "register" && (
            <>
              <div>
                <label className={label}>{L("Full Name","পূর্ণ নাম")}</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className={input} placeholder={L("Your name","আপনার নাম")} autoComplete="name" />
              </div>
              <div>
                <label className={label}>{L("Mobile Number","মোবাইল নম্বর")}</label>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="numeric" className={input} placeholder="01XXXXXXXXX" autoComplete="tel" />
              </div>
            </>
          )}

          <div>
            <label className={label}>{L("Email","ইমেইল")}</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={input} placeholder="you@email.com" autoComplete="email" />
          </div>

          {mode !== "forgot" && (
            <div>
              <label className={label}>{L("Password","পাসওয়ার্ড")}</label>
              <div className="relative">
                <input type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className={input + " pr-16"} placeholder="••••••••" autoComplete={mode === "login" ? "current-password" : "new-password"} />
                <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-brand">{show ? L("Hide","লুকান") : L("Show","দেখুন")}</button>
              </div>
              {mode === "login" && (
                <div className="mt-1.5 text-right">
                  <a href="/account/forgot" className="text-xs font-medium text-brand hover:underline">{L("Forgot password?","পাসওয়ার্ড ভুলে গেছেন?")}</a>
                </div>
              )}
            </div>
          )}

          {err && <p className="rounded-xl bg-red-50 text-red-600 text-sm px-3 py-2">{err}</p>}
          {ok && <p className="rounded-xl bg-green-50 text-green-700 text-sm px-3 py-2">{ok}</p>}

          <button type="submit" disabled={busy} className="w-full rounded-xl bg-brand text-white py-3.5 font-semibold shadow-sm hover:bg-brand-dark disabled:opacity-60 transition">
            {busy ? "..." : mode === "login" ? L("Log In","লগইন") : mode === "register" ? L("Create Account","অ্যাকাউন্ট তৈরি করুন") : L("Send Reset Link","রিসেট লিংক পাঠান")}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-gray-500">
          {mode === "login" ? (
            <>{L("No account?","অ্যাকাউন্ট নেই?")} <a href="/account/register" className="font-semibold text-brand hover:underline">{L("Create one","তৈরি করুন")}</a></>
          ) : (
            <>{L("Already have an account?","ইতিমধ্যে অ্যাকাউন্ট আছে?")} <a href="/account/login" className="font-semibold text-brand hover:underline">{L("Log in","লগইন করুন")}</a></>
          )}
        </p>
      </div>
    </div>
  );
}
