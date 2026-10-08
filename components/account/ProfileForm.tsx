"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateProfile } from "@/app/account/actions";
import { useL } from "@/components/i18n/I18nProvider";
import { T } from "@/components/i18n/T";

// Local-only (avoid importing server-side carrybee into this client component).
function toLocalBdPhone(raw: string): string {
  let d = (raw || "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("880")) d = "0" + d.slice(3);
  else if (d.startsWith("1") && d.length === 10) d = "0" + d;
  return d;
}

// supabase-js is only needed when the customer actually verifies a number → lazy-load it.
async function getSb() {
  const m = await import("@/lib/supabase/ssr-browser");
  return m.getSupabaseBrowserClient();
}

/**
 * SECURITY: typing a phone number here does NOT give access to that number's orders.
 * Orders are shown only if they were placed while logged in, or if the customer proves
 * they own the number with an SMS code (Supabase phone_change OTP) — handled below.
 */
export function ProfileForm({
  initialName, initialPhone, email, verifiedPhone,
}: { initialName: string; initialPhone: string; email: string; verifiedPhone: string }) {
  const router = useRouter();
  const { L } = useL();
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(toLocalBdPhone(initialPhone) || initialPhone);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  // OTP verification state
  const [verified, setVerified] = useState(toLocalBdPhone(verifiedPhone));
  const [codeSentTo, setCodeSentTo] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [vBusy, setVBusy] = useState(false);

  const local = toLocalBdPhone(phone);
  const validPhone = /^01\d{9}$/.test(local);
  const isVerified = validPhone && local === verified;

  const input = "w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-[15px] outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 transition";
  const label = "block text-[13px] font-medium text-gray-600 mb-1.5";

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setOk(null); setBusy(true);
    const res = await updateProfile({ name, phone });
    setBusy(false);
    if (!res.ok) { setErr(res.error ?? L("Save failed.", "সেভ ব্যর্থ।")); return; }
    setOk(L("Saved ✓", "সেভ হয়েছে ✓"));
    router.refresh();
  }

  function authError(msg: string): string {
    const m = (msg || "").toLowerCase();
    if (/already|exists|registered|taken/.test(m))
      return L(
        "This number already has its own account. Log out and log in with this phone number to see its orders.",
        "এই নম্বর দিয়ে আলাদা একটি অ্যাকাউন্ট আছে। এর অর্ডার দেখতে লগআউট করে এই মোবাইল নম্বর দিয়ে লগইন করুন।"
      );
    if (/expired|invalid|token/.test(m)) return L("Wrong or expired code. Try again.", "কোড ভুল বা মেয়াদ শেষ। আবার চেষ্টা করুন।");
    if (/rate|too many|seconds/.test(m)) return L("Too many tries — please wait a minute.", "অনেকবার চেষ্টা হয়েছে — এক মিনিট পরে আবার চেষ্টা করুন।");
    return msg || L("Something went wrong.", "কিছু একটা সমস্যা হয়েছে।");
  }

  async function sendCode() {
    setErr(null); setOk(null);
    if (!validPhone) { setErr(L("Enter a valid mobile number (01XXXXXXXXX).", "সঠিক মোবাইল নম্বর দিন (01XXXXXXXXX)।")); return; }
    setVBusy(true);
    try {
      const sb = await getSb();
      const { error } = await sb.auth.updateUser({ phone: "+88" + local });
      if (error) { setErr(authError(error.message)); return; }
      setCodeSentTo(local); setCode("");
      setOk(L(`Code sent by SMS to ${local}.`, `${local} নম্বরে SMS-এ কোড পাঠানো হয়েছে।`));
    } catch (e: any) {
      setErr(authError(e?.message));
    } finally {
      setVBusy(false);
    }
  }

  async function confirmCode() {
    if (!codeSentTo) return;
    setErr(null); setOk(null);
    const token = code.replace(/\D/g, "");
    if (token.length < 4) { setErr(L("Enter the code from the SMS.", "SMS-এ আসা কোডটি দিন।")); return; }
    setVBusy(true);
    try {
      const sb = await getSb();
      const { error } = await sb.auth.verifyOtp({ phone: "+88" + codeSentTo, token, type: "phone_change" });
      if (error) { setErr(authError(error.message)); return; }
      // Number proven — keep the profile's contact phone in sync with it.
      await updateProfile({ name: name || initialName, phone: codeSentTo });
      setVerified(codeSentTo); setPhone(codeSentTo); setCodeSentTo(null); setCode("");
      setOk(L("Number verified ✓ Orders placed with this number now appear in My Orders.", "নম্বর ভেরিফাই হয়েছে ✓ এই নম্বরের অর্ডারগুলো এখন 'আমার অর্ডার'-এ দেখা যাবে।"));
      router.refresh();
    } catch (e: any) {
      setErr(authError(e?.message));
    } finally {
      setVBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="rounded-3xl bg-white ring-1 ring-black/5 shadow-sm p-6 space-y-4 max-w-lg">
      <div>
        <label className={label}><T en="Full name" bn="পূর্ণ নাম" /></label>
        <input value={name} onChange={(e) => setName(e.target.value)} className={input} />
      </div>

      <div>
        <label className={label}><T en="Mobile number" bn="মোবাইল নম্বর" /></label>
        <div className="relative">
          <input
            value={phone}
            onChange={(e) => { setPhone(e.target.value); setCodeSentTo(null); }}
            inputMode="numeric"
            className={input + (isVerified ? " pr-28" : "")}
            placeholder="01XXXXXXXXX"
          />
          {isVerified && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-green-50 text-green-700 ring-1 ring-green-200 text-xs font-semibold px-2.5 py-1">
              ✓ <T en="Verified" bn="ভেরিফাইড" />
            </span>
          )}
        </div>

        {isVerified ? (
          <p className="mt-1.5 text-xs text-gray-500">
            <T en="Orders placed with this number show in My Orders." bn="এই নম্বরে করা অর্ডারগুলো 'আমার অর্ডার'-এ দেখা যাবে।" />
          </p>
        ) : codeSentTo && codeSentTo === local ? (
          <div className="mt-2 rounded-2xl bg-brand-soft/60 ring-1 ring-brand/15 p-3 space-y-2">
            <p className="text-xs text-gray-600">
              <T en={`Enter the code sent to ${codeSentTo}`} bn={`${codeSentTo} নম্বরে পাঠানো কোডটি দিন`} />
            </p>
            <div className="flex gap-2">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={8}
                className={input + " tracking-[0.3em] text-center"}
                placeholder="••••••"
              />
              <button type="button" onClick={confirmCode} disabled={vBusy}
                className="shrink-0 rounded-xl bg-brand text-white px-4 font-semibold hover:bg-brand-dark disabled:opacity-60 transition">
                {vBusy ? "..." : <T en="Verify" bn="যাচাই" />}
              </button>
            </div>
            <button type="button" onClick={sendCode} disabled={vBusy} className="text-xs text-brand-dark underline disabled:opacity-60">
              <T en="Resend code" bn="আবার কোড পাঠান" />
            </button>
          </div>
        ) : (
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            <p className="text-xs text-gray-500">
              <T
                en="To see older orders placed with this number, verify it by SMS."
                bn="এই নম্বরে আগে করা অর্ডার দেখতে SMS কোড দিয়ে নম্বরটি ভেরিফাই করুন।"
              />
            </p>
            <button type="button" onClick={sendCode} disabled={vBusy || !validPhone}
              className="text-xs font-semibold text-brand-dark underline underline-offset-2 disabled:opacity-50">
              {vBusy ? "..." : <T en="Verify with SMS code" bn="SMS কোড দিয়ে ভেরিফাই" />}
            </button>
          </div>
        )}
      </div>

      <div>
        <label className={label}><T en="Email" bn="ইমেইল" /></label>
        <input value={email} disabled className={input + " opacity-60 cursor-not-allowed"} />
      </div>

      {err && <p className="rounded-xl bg-red-50 text-red-600 text-sm px-3 py-2">{err}</p>}
      {ok && <p className="rounded-xl bg-green-50 text-green-700 text-sm px-3 py-2">{ok}</p>}

      <button type="submit" disabled={busy} className="rounded-xl bg-brand text-white px-6 py-3 font-semibold hover:bg-brand-dark disabled:opacity-60 transition">
        {busy ? "..." : <T en="Save" bn="সেভ করুন" />}
      </button>
    </form>
  );
}
