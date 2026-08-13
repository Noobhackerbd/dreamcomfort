"use client";

// app/admin/settings/NotificationSetup.tsx
// Settings-page control to enable/disable order notifications on THIS device
// and test the notification sound. (Replaces the old floating overlay button.)

import { useCallback, useEffect, useState } from "react";
import { playOrderSound } from "@/components/admin/AdminLive";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function NotificationSetup() {
  const [supported, setSupported] = useState(true);
  const [perm, setPerm] = useState<NotificationPermission>("default");
  const [pushOn, setPushOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (typeof Notification === "undefined" || !("serviceWorker" in navigator)) {
      setSupported(false);
      return;
    }
    setPerm(Notification.permission);
    (async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        const sub = await reg?.pushManager?.getSubscription();
        setPushOn(!!sub);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const enable = useCallback(async () => {
    setBusy(true);
    setMsg(null);
    try {
      playOrderSound(); // unlock + confirm audio within the click gesture
      const permission = await Notification.requestPermission();
      setPerm(permission);
      if (permission !== "granted") {
        setMsg("নোটিফিকেশন অনুমতি দেওয়া হয়নি। ব্রাউজার সেটিংস থেকে Allow করুন।");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      if (!VAPID_PUBLIC_KEY) {
        setMsg("এই ডিভাইসে ইন-অ্যাপ নোটিফিকেশন চালু হয়েছে। (অ্যাপ বন্ধ থাকা অবস্থায় পুশের জন্য VAPID কী দরকার।)");
        return;
      }
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }
      const res = await fetch("/api/admin/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub }),
      });
      setPushOn(res.ok);
      setMsg(res.ok ? "✅ এই ডিভাইসে অর্ডার নোটিফিকেশন চালু হয়েছে।" : "সাবস্ক্রিপশন সেভ ব্যর্থ হয়েছে।");
    } catch (e) {
      console.error(e);
      setMsg("নোটিফিকেশন চালু করতে সমস্যা হয়েছে।");
    } finally {
      setBusy(false);
    }
  }, []);

  const disable = useCallback(async () => {
    setBusy(true);
    setMsg(null);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager?.getSubscription();
      if (sub) {
        await fetch("/api/admin/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setPushOn(false);
      setMsg("এই ডিভাইসে পুশ নোটিফিকেশন বন্ধ করা হয়েছে।");
    } catch {
      setMsg("বন্ধ করতে সমস্যা হয়েছে।");
    } finally {
      setBusy(false);
    }
  }, []);

  return (
    <div className="rounded-2xl border bg-white p-5">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">🔔</span>
        <h2 className="font-semibold">অর্ডার নোটিফিকেশন</h2>
        <span
          className={
            "ml-auto text-xs rounded-full px-2.5 py-1 font-medium " +
            (pushOn
              ? "bg-green-100 text-green-700"
              : perm === "granted"
              ? "bg-amber-100 text-amber-700"
              : "bg-gray-100 text-gray-500")
          }
        >
          {pushOn ? "চালু (এই ডিভাইস)" : perm === "granted" ? "আংশিক" : "বন্ধ"}
        </span>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        নতুন অর্ডার এলে সাউন্ড + নোটিফিকেশন পাবেন। অ্যাপ বন্ধ থাকলেও পুশ পেতে প্রতিটি ডিভাইসে একবার চালু করুন।
        (মোবাইলে: আগে সাইটটি হোম স্ক্রিনে <b>Add to Home Screen</b> করে সেখান থেকে খুলুন।)
      </p>

      {!supported ? (
        <p className="text-sm text-red-600">এই ব্রাউজারে নোটিফিকেশন সাপোর্ট করে না।</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {!pushOn ? (
            <button
              onClick={enable}
              disabled={busy}
              className="rounded-xl bg-brand text-white px-5 py-2.5 text-sm font-medium hover:bg-brand-dark disabled:opacity-60"
            >
              {busy ? "চালু হচ্ছে..." : "🔔 এই ডিভাইসে চালু করুন"}
            </button>
          ) : (
            <button
              onClick={disable}
              disabled={busy}
              className="rounded-xl border border-red-200 text-red-600 px-5 py-2.5 text-sm font-medium hover:bg-red-50 disabled:opacity-60"
            >
              🔕 বন্ধ করুন
            </button>
          )}
          <button
            onClick={() => playOrderSound()}
            className="rounded-xl border px-5 py-2.5 text-sm hover:bg-gray-50"
          >
            🔊 সাউন্ড টেস্ট
          </button>
        </div>
      )}
      {msg && <p className="mt-3 text-sm text-gray-600">{msg}</p>}
    </div>
  );
}
