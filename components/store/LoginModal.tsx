"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/ssr-browser";
import { loginCustomer } from "@/app/account/actions";

type Tab = "password" | "phone";

function localToIntl(raw: string): string | null {
  const d = (raw || "").replace(/\D/g, "");
  let local = d;
  if (local.startsWith("88")) local = local.slice(2);
  if (!/^01\d{9}$/.test(local)) return null;
  return "+88" + local;
}

export function LoginModal() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  // Open on the global event; if already signed in, go straight to the account page.
  useEffect(() => {
    async function onOpen() {
      try {
        const sb = getSupabaseBrowserClient();
        const { data } = await sb.auth.getUser();
        if (data.user) { window.location.href = "/account"; return; }
      } catch {}
      setErr(null); setMsg(null); setOtpSent(false);
      setOpen(true);
    }
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    window.addEventListener("dc:open-login", onOpen as EventListener);
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("dc:open-login", onOpen as EventListener); window.removeEventListener("keydown", onKey); };
  }, []);

  if (!open) return null;

  const input = "w-full rounded-lg border border-black/15 bg-white px-4 py-3 text-[15px] outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 transition";

  async function passwordLogin(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setBusy(true);
    try {
      const res = await loginCustomer({ email, password });
      if (!res.ok) { setErr(res.error ?? "লগইন ব্যর্থ।"); return; }
      window.location.href = "/account";
    } finally { setBusy(false); }
  }

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setMsg(null);
    const intl = localToIntl(phone);
    if (!intl) { setErr("সঠিক মোবাইল নম্বর দিন (০১XXXXXXXXX)।"); return; }
    setBusy(true);
    try {
      const sb = getSupabaseBrowserClient();
      const { error } = await sb.auth.signInWithOtp({ phone: intl });
      if (error) { setErr(error.message); return; }
      setOtpSent(true); setMsg("কোড পাঠানো হয়েছে আপনার মোবাইলে।");
    } catch (e: any) { setErr(e?.message ?? "ব্যর্থ।"); }
    finally { setBusy(false); }
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const intl = localToIntl(phone);
    if (!intl || !code.trim()) { setErr("কোড দিন।"); return; }
    setBusy(true);
    try {
      const sb = getSupabaseBrowserClient();
      const { error } = await sb.auth.verifyOtp({ phone: intl, token: code.trim(), type: "sms" });
      if (error) { setErr(error.message); return; }
      window.location.href = "/account";
    } catch (e: any) { setErr(e?.message ?? "ব্যর্থ।"); }
    finally { setBusy(false); }
  }

  async function oauth(provider: "google" | "facebook") {
    setErr(null); setBusy(true);
    try {
      const sb = getSupabaseBrowserClient();
      const { error } = await sb.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/auth/callback?next=/account` },
      });
      if (error) { setErr(error.message); setBusy(false); }
    } catch (e: any) { setErr(e?.message ?? "ব্যর্থ।"); setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm grid place-items-center px-4" onClick={() => setOpen(false)}>
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl p-6 sm:p-7 relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={() => setOpen(false)} aria-label="বন্ধ" className="absolute right-4 top-4 h-8 w-8 grid place-items-center rounded-full text-gray-400 hover:bg-black/5 transition">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>

        {/* Tabs */}
        <div className="flex items-center justify-center gap-6 mb-6">
          <button onClick={() => { setTab("password"); setErr(null); }} className={"text-[17px] font-bold transition " + (tab === "password" ? "text-gray-900" : "text-gray-400")}>পাসওয়ার্ড</button>
          <span className="h-5 w-px bg-black/10" />
          <button onClick={() => { setTab("phone"); setErr(null); }} className={"text-[17px] font-bold transition " + (tab === "phone" ? "text-gray-900" : "text-gray-400")}>ফোন নম্বর</button>
        </div>

        {tab === "password" ? (
          <form onSubmit={passwordLogin} className="space-y-3">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="আপনার ইমেইল দিন" className={input} autoComplete="email" />
            <div className="relative">
              <input type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="আপনার পাসওয়ার্ড দিন" className={input + " pr-16"} autoComplete="current-password" />
              <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400">{show ? "লুকান" : "দেখুন"}</button>
            </div>
            <div className="text-right">
              <a href="/account/forgot" className="text-[13px] font-medium text-gray-500 hover:text-brand">পাসওয়ার্ড ভুলে গেছেন?</a>
            </div>
            {err && <p className="rounded-lg bg-red-50 text-red-600 text-sm px-3 py-2">{err}</p>}
            <button type="submit" disabled={busy} className="w-full rounded-lg text-white py-3 font-bold tracking-wide disabled:opacity-60 transition" style={{ background: "#F57224" }}>
              {busy ? "..." : "লগইন"}
            </button>
          </form>
        ) : (
          <form onSubmit={otpSent ? verifyOtp : sendOtp} className="space-y-3">
            <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="numeric" placeholder="মোবাইল নম্বর (01XXXXXXXXX)" className={input} autoComplete="tel" disabled={otpSent} />
            {otpSent && (
              <input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" placeholder="OTP কোড দিন" className={input} autoComplete="one-time-code" />
            )}
            {err && <p className="rounded-lg bg-red-50 text-red-600 text-sm px-3 py-2">{err}</p>}
            {msg && <p className="rounded-lg bg-green-50 text-green-700 text-sm px-3 py-2">{msg}</p>}
            <button type="submit" disabled={busy} className="w-full rounded-lg text-white py-3 font-bold tracking-wide disabled:opacity-60 transition" style={{ background: "#F57224" }}>
              {busy ? "..." : otpSent ? "যাচাই করুন" : "কোড পাঠান"}
            </button>
            {otpSent && <button type="button" onClick={() => { setOtpSent(false); setCode(""); setMsg(null); }} className="w-full text-center text-[13px] text-gray-500">নম্বর পরিবর্তন করুন</button>}
          </form>
        )}

        <p className="mt-4 text-center text-sm text-gray-500">
          অ্যাকাউন্ট নেই? <a href="/account/register" className="font-semibold text-blue-600 hover:underline">Sign up</a>
        </p>

        <div className="mt-6 flex items-center gap-3 text-gray-400 text-[13px]">
          <span className="h-px flex-1 bg-black/10" /> অথবা লগইন করুন <span className="h-px flex-1 bg-black/10" />
        </div>

        <div className="mt-4 flex items-center justify-center gap-8">
          <button onClick={() => oauth("google")} disabled={busy} className="flex items-center gap-2 text-sm font-medium text-gray-700 disabled:opacity-60">
            <svg viewBox="0 0 24 24" className="h-6 w-6"><path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8z" /><path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1 .7-2.4 1.1-4 1.1-3 0-5.6-2-6.5-4.8H1.5v3.1A12 12 0 0 0 12 24z" /><path fill="#FBBC05" d="M5.5 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.5a12 12 0 0 0 0 10.8l4-3.1z" /><path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.5 6.6l4 3.1C6.4 6.8 9 4.8 12 4.8z" /></svg>
            Google
          </button>
          <button onClick={() => oauth("facebook")} disabled={busy} className="flex items-center gap-2 text-sm font-medium text-gray-700 disabled:opacity-60">
            <svg viewBox="0 0 24 24" className="h-6 w-6"><circle cx="12" cy="12" r="12" fill="#1877F2" /><path fill="#fff" d="M15.6 12.5l.4-2.6h-2.5V8.2c0-.7.3-1.4 1.5-1.4h1.2V4.6s-1.1-.2-2.1-.2c-2.1 0-3.5 1.3-3.5 3.6v2h-2.3v2.6h2.3V19h2.9v-6.5z" /></svg>
            Facebook
          </button>
        </div>
      </div>
    </div>
  );
}
