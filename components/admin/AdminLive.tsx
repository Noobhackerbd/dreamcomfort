"use client";

// components/admin/AdminLive.tsx
// One client component mounted in the admin shell that does three things:
//  1) Auto-refresh — keeps every admin page live (no manual reload) via router.refresh().
//  2) Foreground alerts — polls for new orders; plays a WooCommerce-style "cha-ching"
//     + shows an in-page toast + a browser notification whenever an order arrives while
//     an admin tab is open (even a background tab).
//  3) Web Push enablement — registers the service worker and subscribes the device so
//     pushes arrive even when the site is fully closed.

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const UI_REFRESH_MS = 20000; // re-render server components when tab is visible
const POLL_MS = 15000; // lightweight new-order poll (runs even in background)
const LAST_TS_KEY = "dc_admin_last_order_ts";

interface RecentOrder {
  id: string;
  order_number: string;
  customer_name: string | null;
  total: number | null;
  area: string | null;
  city: string | null;
  created_at: string;
}

interface Toast {
  id: string;
  order_number: string;
  name: string;
  total: number;
}

/* ---------- WooCommerce-style "cha-ching" via Web Audio (no asset needed) ---------- */
let audioCtx: AudioContext | null = null;
function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!audioCtx) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      audioCtx = new AC();
    }
    if (audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  } catch {
    return null;
  }
}
function bell(ctx: AudioContext, freq: number, start: number, dur: number, gain: number) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(freq, start);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(gain, start + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + dur + 0.02);
}
function playChaChing() {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime + 0.01;
  // two bright ascending dings — the classic cash-register "cha-ching"
  bell(ctx, 1318.5, t, 0.16, 0.28); // E6
  bell(ctx, 1567.98, t + 0.006, 0.16, 0.22); // G6 (shimmer)
  bell(ctx, 1975.5, t + 0.13, 0.5, 0.3); // B6 ring-out
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function AdminLive() {
  const router = useRouter();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">("default");
  const [pushOn, setPushOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const lastTsRef = useRef<string | null>(null);
  const baseTitle = useRef<string>("");
  const unseen = useRef<number>(0);

  /* ---- init: notification permission + baseline timestamp ---- */
  useEffect(() => {
    baseTitle.current = document.title;
    if (typeof Notification === "undefined") setPerm("unsupported");
    else setPerm(Notification.permission);
    lastTsRef.current = localStorage.getItem(LAST_TS_KEY);
    // detect an existing push subscription
    (async () => {
      try {
        const reg = await navigator.serviceWorker?.getRegistration();
        const sub = await reg?.pushManager?.getSubscription();
        setPushOn(!!sub);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const clearBadge = useCallback(() => {
    unseen.current = 0;
    if (baseTitle.current) document.title = baseTitle.current;
  }, []);

  /* ---- alert on a batch of new orders ---- */
  const alertNew = useCallback((orders: RecentOrder[]) => {
    if (!orders.length) return;
    playChaChing();
    const newToasts = orders.slice(0, 4).map((o) => ({
      id: o.id,
      order_number: o.order_number,
      name: o.customer_name || "গ্রাহক",
      total: Math.round(Number(o.total) || 0),
    }));
    setToasts((t) => [...newToasts, ...t].slice(0, 5));

    unseen.current += orders.length;
    if (baseTitle.current) document.title = `(${unseen.current}) 🛒 ${baseTitle.current}`;

    // Local browser notification (nice when the tab is in the background but browser open).
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      orders.slice(0, 4).forEach((o) => {
        try {
          const n = new Notification(`🛒 নতুন অর্ডার · ${o.order_number}`, {
            body: `${o.customer_name || "গ্রাহক"} · ৳${Math.round(Number(o.total) || 0)}${
              o.area ? " · " + o.area : ""
            }`,
            icon: "/icon.png",
            tag: `order-${o.id}`,
          });
          n.onclick = () => {
            window.focus();
            router.push(`/admin/orders/${o.id}`);
            n.close();
          };
        } catch {
          /* ignore */
        }
      });
    }
    // Refresh the underlying page so lists/counters reflect the new order.
    router.refresh();
  }, [router]);

  /* ---- poll for new orders (runs even when tab hidden) ---- */
  useEffect(() => {
    let stopped = false;
    async function poll() {
      try {
        const since = lastTsRef.current;
        const res = await fetch(
          "/api/admin/orders/recent" + (since ? `?since=${encodeURIComponent(since)}` : ""),
          { cache: "no-store" }
        );
        if (!res.ok) return;
        const json = await res.json();
        const orders: RecentOrder[] = json.orders ?? [];
        if (!lastTsRef.current) {
          // First run = establish a baseline WITHOUT alerting for existing orders.
          const newest = orders[0]?.created_at || json.serverTime;
          if (newest) {
            lastTsRef.current = newest;
            localStorage.setItem(LAST_TS_KEY, newest);
          }
          return;
        }
        if (orders.length) {
          const newest = orders[0].created_at;
          lastTsRef.current = newest;
          localStorage.setItem(LAST_TS_KEY, newest);
          if (!stopped) alertNew(orders);
        }
      } catch {
        /* network hiccup — try again next tick */
      }
    }
    poll();
    const id = setInterval(poll, POLL_MS);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, [alertNew]);

  /* ---- keep the visible UI fresh (server components) ---- */
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, UI_REFRESH_MS);
    const onVis = () => {
      if (document.visibilityState === "visible") {
        clearBadge();
        router.refresh();
      }
    };
    window.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onVis);
    return () => {
      clearInterval(id);
      window.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onVis);
    };
  }, [router, clearBadge]);

  /* ---- enable push (SW register + permission + subscribe) ---- */
  const enablePush = useCallback(async () => {
    setBusy(true);
    try {
      getCtx(); // unlock audio within this user gesture
      if (typeof Notification === "undefined" || !("serviceWorker" in navigator)) {
        alert("এই ব্রাউজারে নোটিফিকেশন সাপোর্ট করে না।");
        return;
      }
      const permission = await Notification.requestPermission();
      setPerm(permission);
      if (permission !== "granted") return;

      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      if (!VAPID_PUBLIC_KEY) {
        // Permission granted → local + background-tab notifications still work.
        // (Full closed-app push needs the VAPID key in env.)
        setPushOn(false);
        playChaChing();
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
      playChaChing();
    } catch (e) {
      console.error("[AdminLive] enablePush failed", e);
      alert("নোটিফিকেশন চালু করতে সমস্যা হয়েছে।");
    } finally {
      setBusy(false);
    }
  }, []);

  const showEnable = perm !== "granted" || (!!VAPID_PUBLIC_KEY && !pushOn);

  return (
    <>
      {/* Enable-notifications control */}
      {perm !== "unsupported" && (
        <div className="fixed bottom-4 right-4 z-[60] flex flex-col items-end gap-2">
          {showEnable ? (
            <button
              onClick={enablePush}
              disabled={busy}
              className="rounded-full bg-brand text-white shadow-lg px-4 py-2.5 text-sm font-medium hover:bg-brand-dark disabled:opacity-60 flex items-center gap-2"
            >
              🔔 {busy ? "চালু হচ্ছে..." : "অর্ডার নোটিফিকেশন চালু করুন"}
            </button>
          ) : (
            <button
              onClick={playChaChing}
              title="সাউন্ড টেস্ট করুন"
              className="rounded-full bg-white ring-1 ring-brand/20 shadow px-3 py-2 text-xs text-brand hover:bg-brand/5"
            >
              🔔 নোটিফিকেশন চালু ✓ (সাউন্ড টেস্ট)
            </button>
          )}
        </div>
      )}

      {/* New-order toasts */}
      <div className="fixed top-4 right-4 z-[70] flex flex-col gap-2 w-[min(92vw,340px)]">
        {toasts.map((t) => (
          <a
            key={t.id + Math.random()}
            href={`/admin/orders/${t.id}`}
            onClick={() => {
              dismiss(t.id);
              clearBadge();
            }}
            className="group rounded-xl border border-green-300 bg-white shadow-lg p-3.5 flex items-start gap-3 animate-[slidein_.25s_ease] hover:border-green-400"
          >
            <span className="text-2xl">🛒</span>
            <span className="flex-1 min-w-0">
              <span className="block font-bold text-green-700">নতুন অর্ডার! {t.order_number}</span>
              <span className="block text-sm text-gray-600 truncate">
                {t.name} · ৳{t.total}
              </span>
            </span>
            <button
              onClick={(e) => {
                e.preventDefault();
                dismiss(t.id);
              }}
              className="text-gray-300 hover:text-gray-500 text-lg leading-none"
            >
              ×
            </button>
          </a>
        ))}
      </div>

      <style>{`@keyframes slidein{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:none}}`}</style>
    </>
  );
}
