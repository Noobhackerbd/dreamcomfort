"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/ssr-browser";
import { loginCustomer, phoneLoginSync, saveCustomerName } from "@/app/account/actions";

type Tab = "password" | "phone";

function localToIntl(raw: string): string | null {
  const d = (raw || "").replace(/\D/g, "");
  let local = d;
  if (local.startsWith("88")) local = local.slice(2);
  if (!/^01\d{9}$/.test(local)) return null;
  return "+88" + local;
}

const Spinner = () => (
  <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.3" />
    <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

export function LoginModal() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [askName, setAskName] = useState(false); // first-time phone login → collect name
  const [custName, setCustName] = useState("");
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

  useEffect(() => {
    if (open) { document.body.style.overflow = "hidden"; return () => { document.body.style.overflow = ""; }; }
  }, [open]);

  if (!open) return null;

  const input = "w-full rounded-xl border border-black/10 bg-white pl-11 pr-4 py-3 text-[15px] outline-none focus:border-brand focus:ring-2 focus:ring-brand-soft transition placeholder:text-gray-400";
  const iconWrap = "absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none";

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
      // First-time phone login has no name — ask for it before entering.
      try {
        const sync = await phoneLoginSync();
        if (sync.needsName) { setAskName(true); return; }
      } catch { /* proceed anyway */ }
      window.location.href = "/account";
    } catch (e: any) { setErr(e?.message ?? "ব্যর্থ।"); }
    finally { setBusy(false); }
  }

  async function submitName(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (custName.trim().length < 2) { setErr("আপনার নাম লিখুন।"); return; }
    setBusy(true);
    try {
      const res = await saveCustomerName(custName);
      if (!res.ok) { setErr(res.error ?? "সেভ ব্যর্থ।"); return; }
      window.location.href = "/account";
    } finally { setBusy(false); }
  }

  async function oauthGoogle() {
    setErr(null); setBusy(true);
    try {
      const sb = getSupabaseBrowserClient();
      const { error } = await sb.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback?next=/account` },
      });
      if (error) { setErr(error.message); setBusy(false); }
    } catch (e: any) { setErr(e?.message ?? "ব্যর্থ।"); setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm grid place-items-center px-4 py-6 overflow-y-auto" onClick={() => setOpen(false)}>
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl p-6 sm:p-7 relative my-auto" onClick={(e) => e.stopPropagation()}>
        <button onClick={() => setOpen(false)} aria-label="বন্ধ" className="absolute right-4 top-4 h-8 w-8 grid place-items-center rounded-full text-gray-400 hover:bg-black/5 transition">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>

        {/* Header */}
        <div className="text-center mb-5 mt-1">
          <div className="mx-auto mb-3 h-12 w-12 rounded-2xl grid place-items-center text-white bg-gradient-to-br from-brand to-brand-dark shadow-[0_6px_16px_-6px_rgba(47,144,204,0.6)]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></svg>
          </div>
          <h2 className="text-xl font-bold font-display text-gray-900">স্বাগতম</h2>
          <p className="text-[13px] text-gray-500 mt-1">{askName ? "আর একটি ধাপ বাকি" : "লগইন করে কেনাকাটা চালিয়ে যান"}</p>
        </div>

        {askName ? (
          <form onSubmit={submitName} className="space-y-3">
            <p className="text-center text-[13px] text-gray-500 -mt-2 mb-1">আপনার নামটি লিখুন — এটি আপনার প্রোফাইলে সংরক্ষিত থাকবে।</p>
            <div className="relative">
              <span className={iconWrap}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></svg></span>
              <input value={custName} onChange={(e) => setCustName(e.target.value)} placeholder="আপনার পুরো নাম" className={input} autoFocus autoComplete="name" />
            </div>
            {err && <p className="rounded-lg bg-red-50 text-red-600 text-sm px-3 py-2">{err}</p>}
            <button type="submit" disabled={busy} className="w-full rounded-xl py-3.5 font-bold text-white bg-gradient-to-b from-brand to-brand-dark shadow-[0_10px_24px_-8px_rgba(47,144,204,0.55)] active:scale-[0.99] transition disabled:opacity-60 flex items-center justify-center gap-2">
              {busy ? <Spinner /> : "সম্পন্ন করুন"}
            </button>
          </form>
        ) : (
        <>
        {/* Segmented toggle */}
        <div className="flex p-1 rounded-xl bg-gray-100 mb-5">
          <button onClick={() => { setTab("password"); setErr(null); }}
            className={"flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-[13.5px] font-bold transition " + (tab === "password" ? "bg-white text-brand-dark shadow-sm" : "text-gray-500")}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className="h-4 w-4"><rect x="4" y="11" width="16" height="9" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
            পাসওয়ার্ড
          </button>
          <button onClick={() => { setTab("phone"); setErr(null); }}
            className={"flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-[13.5px] font-bold transition " + (tab === "phone" ? "bg-white text-brand-dark shadow-sm" : "text-gray-500")}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className="h-4 w-4"><rect x="7" y="2" width="10" height="20" rx="2.5" /><path d="M11 18h2" /></svg>
            ফোন নম্বর
          </button>
        </div>

        {tab === "password" ? (
          <form onSubmit={passwordLogin} className="space-y-3">
            <div className="relative">
              <span className={iconWrap}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M4 7l8 6 8-6" /></svg></span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="আপনার ইমেইল দিন" className={input} autoComplete="email" />
            </div>
            <div className="relative">
              <span className={iconWrap}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5"><rect x="4" y="11" width="16" height="9" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg></span>
              <input type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="আপনার পাসওয়ার্ড দিন" className={input + " pr-11"} autoComplete="current-password" />
              <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "লুকান" : "দেখুন"} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {show
                  ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></svg>
                  : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5"><path d="M3 3l18 18M10.6 10.6a3 3 0 0 0 4.2 4.2M9.9 5.2A9.6 9.6 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.3 4M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.5 9.5 0 0 0 3-.5" /></svg>}
              </button>
            </div>
            <div className="text-right">
              <a href="/account/forgot" className="text-[13px] font-medium text-gray-500 hover:text-brand">পাসওয়ার্ড ভুলে গেছেন?</a>
            </div>
            {err && <p className="rounded-lg bg-red-50 text-red-600 text-sm px-3 py-2">{err}</p>}
            <button type="submit" disabled={busy} className="w-full rounded-xl py-3.5 font-bold text-white bg-gradient-to-b from-brand to-brand-dark shadow-[0_10px_24px_-8px_rgba(47,144,204,0.55)] hover:shadow-[0_14px_30px_-8px_rgba(47,144,204,0.7)] active:scale-[0.99] transition disabled:opacity-60 flex items-center justify-center gap-2">
              {busy ? <Spinner /> : "লগইন করুন"}
            </button>
          </form>
        ) : (
          <form onSubmit={otpSent ? verifyOtp : sendOtp} className="space-y-3">
            <div className="relative">
              <span className={iconWrap}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5"><rect x="7" y="2" width="10" height="20" rx="2.5" /><path d="M11 18h2" /></svg></span>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="numeric" placeholder="মোবাইল নম্বর (01XXXXXXXXX)" className={input} autoComplete="tel" disabled={otpSent} />
            </div>
            {otpSent && (
              <div className="relative">
                <span className={iconWrap}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5"><circle cx="8" cy="15" r="4" /><path d="M10.8 12.2L20 3M17 6l2 2M14 9l2 2" /></svg></span>
                <input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" placeholder="OTP কোড দিন" className={input + " tracking-[0.3em] font-semibold"} autoComplete="one-time-code" autoFocus />
              </div>
            )}
            {err && <p className="rounded-lg bg-red-50 text-red-600 text-sm px-3 py-2">{err}</p>}
            {msg && <p className="rounded-lg bg-green-50 text-green-700 text-sm px-3 py-2">{msg}</p>}
            <button type="submit" disabled={busy} className="w-full rounded-xl py-3.5 font-bold text-white bg-gradient-to-b from-brand to-brand-dark shadow-[0_10px_24px_-8px_rgba(47,144,204,0.55)] hover:shadow-[0_14px_30px_-8px_rgba(47,144,204,0.7)] active:scale-[0.99] transition disabled:opacity-60 flex items-center justify-center gap-2">
              {busy ? <Spinner /> : otpSent ? "যাচাই করুন" : "কোড পাঠান"}
            </button>
            {otpSent && <button type="button" onClick={() => { setOtpSent(false); setCode(""); setMsg(null); }} className="w-full text-center text-[13px] font-medium text-gray-500 hover:text-brand">← নম্বর পরিবর্তন করুন</button>}
          </form>
        )}

        <p className="mt-4 text-center text-sm text-gray-500">
          অ্যাকাউন্ট নেই? <a href="/account/register" className="font-bold text-brand-dark hover:underline">Sign up</a>
        </p>

        <div className="mt-5 flex items-center gap-3 text-gray-400 text-[13px]">
          <span className="h-px flex-1 bg-black/10" /> অথবা <span className="h-px flex-1 bg-black/10" />
        </div>

        {/* Google (full width) */}
        <button onClick={oauthGoogle} disabled={busy}
          className="mt-4 w-full rounded-xl border border-black/12 py-3 flex items-center justify-center gap-2.5 text-[14px] font-semibold text-gray-700 hover:bg-gray-50 active:scale-[0.99] transition disabled:opacity-60">
          <svg viewBox="0 0 24 24" className="h-5 w-5"><path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8z" /><path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1 .7-2.4 1.1-4 1.1-3 0-5.6-2-6.5-4.8H1.5v3.1A12 12 0 0 0 12 24z" /><path fill="#FBBC05" d="M5.5 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.5a12 12 0 0 0 0 10.8l4-3.1z" /><path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.5 6.6l4 3.1C6.4 6.8 9 4.8 12 4.8z" /></svg>
          Google দিয়ে লগইন
        </button>

        <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-gray-400">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-3.5 w-3.5"><rect x="4" y="11" width="16" height="9" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
          আপনার তথ্য সম্পূর্ণ সুরক্ষিত
        </p>
        </>
        )}
      </div>
    </div>
  );
}
