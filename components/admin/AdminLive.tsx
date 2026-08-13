"use client";

// components/admin/AdminLive.tsx
// Global admin runtime (mounted once in the admin shell):
//  1) Auto-refresh — keeps every admin page live via a seamless router.refresh()
//     (no loading skeleton flash).
//  2) New-order alerts — polls for new orders; plays the uploaded cash-register
//     sound + shows an in-page toast + a browser notification whenever an order
//     arrives while an admin tab is open (even a background tab).
//
// The "enable notifications" control now lives in Settings (NotificationSetup),
// so there is no floating overlay here — only the transient new-order toasts.

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const POLL_MS = 12000; // lightweight new-order poll (runs even in background)
const UI_REFRESH_MS = 20000; // re-render server components when visible
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
  key: string;
  id: string;
  order_number: string;
  name: string;
  total: number;
}

/* ---------------- sound: uploaded mp3, with a synth fallback ---------------- */
let audioEl: HTMLAudioElement | null = null;
function getAudio(): HTMLAudioElement | null {
  if (typeof Audio === "undefined") return null;
  if (!audioEl) {
    audioEl = new Audio("/sounds/new-order.mp3");
    audioEl.preload = "auto";
    audioEl.volume = 1;
  }
  return audioEl;
}
let synthCtx: AudioContext | null = null;
function synthChaChing() {
  try {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!synthCtx) synthCtx = new AC();
    if (synthCtx.state === "suspended") synthCtx.resume();
    const ctx = synthCtx;
    const t = ctx.currentTime + 0.01;
    const bell = (f: number, s: number, d: number, g: number) => {
      const o = ctx.createOscillator();
      const gn = ctx.createGain();
      o.type = "triangle";
      o.frequency.setValueAtTime(f, s);
      gn.gain.setValueAtTime(0.0001, s);
      gn.gain.exponentialRampToValueAtTime(g, s + 0.012);
      gn.gain.exponentialRampToValueAtTime(0.0001, s + d);
      o.connect(gn);
      gn.connect(ctx.destination);
      o.start(s);
      o.stop(s + d + 0.02);
    };
    bell(1318.5, t, 0.16, 0.28);
    bell(1567.98, t + 0.006, 0.16, 0.22);
    bell(1975.5, t + 0.13, 0.5, 0.3);
  } catch {
    /* ignore */
  }
}
export function playOrderSound() {
  const a = getAudio();
  if (a) {
    try {
      a.currentTime = 0;
      const p = a.play();
      if (p && typeof p.catch === "function") p.catch(() => synthChaChing());
      return;
    } catch {
      /* fall through */
    }
  }
  synthChaChing();
}

export function AdminLive() {
  const router = useRouter();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const lastTsRef = useRef<string | null>(null);
  const baseTitle = useRef<string>("");
  const unseen = useRef<number>(0);

  useEffect(() => {
    baseTitle.current = document.title;
    lastTsRef.current = localStorage.getItem(LAST_TS_KEY);
    // Prime audio on the first user interaction so playback isn't blocked later.
    const unlock = () => {
      const a = getAudio();
      if (a) {
        a.muted = true;
        a.play()
          .then(() => {
            a.pause();
            a.currentTime = 0;
            a.muted = false;
          })
          .catch(() => {
            a.muted = false;
          });
      }
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);

  const dismiss = useCallback((key: string) => {
    setToasts((t) => t.filter((x) => x.key !== key));
  }, []);
  const clearBadge = useCallback(() => {
    unseen.current = 0;
    if (baseTitle.current) document.title = baseTitle.current;
  }, []);

  const alertNew = useCallback(
    (orders: RecentOrder[]) => {
      if (!orders.length) return;
      playOrderSound();
      const stamp = String(Date.now());
      const newToasts: Toast[] = orders.slice(0, 4).map((o, i) => ({
        key: o.id + "-" + stamp + "-" + i,
        id: o.id,
        order_number: o.order_number,
        name: o.customer_name || "গ্রাহক",
        total: Math.round(Number(o.total) || 0),
      }));
      setToasts((t) => [...newToasts, ...t].slice(0, 5));
      unseen.current += orders.length;
      if (baseTitle.current) document.title = `(${unseen.current}) 🛒 ${baseTitle.current}`;

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
      router.refresh(); // seamless — no loading skeleton
    },
    [router]
  );

  // Poll for new orders (keeps running even when the tab is hidden).
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
          const newest = orders[0]?.created_at || json.serverTime;
          if (newest) {
            lastTsRef.current = newest;
            localStorage.setItem(LAST_TS_KEY, newest);
          }
          return;
        }
        if (orders.length) {
          lastTsRef.current = orders[0].created_at;
          localStorage.setItem(LAST_TS_KEY, orders[0].created_at);
          if (!stopped) alertNew(orders);
        }
      } catch {
        /* retry next tick */
      }
    }
    poll();
    const id = setInterval(poll, POLL_MS);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, [alertNew]);

  // Keep the visible UI fresh — seamless refresh, only when the tab is visible.
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
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onVis);
    };
  }, [router, clearBadge]);

  return (
    <div className="fixed top-4 right-4 z-[70] flex flex-col gap-2 w-[min(92vw,340px)] pointer-events-none">
      {toasts.map((t) => (
        <a
          key={t.key}
          href={`/admin/orders/${t.id}`}
          onClick={() => {
            dismiss(t.key);
            clearBadge();
          }}
          className="pointer-events-auto group rounded-2xl border border-green-300 bg-white/95 backdrop-blur shadow-soft p-3.5 flex items-start gap-3 hover:border-green-400 transition"
          style={{ animation: "dcSlideIn .25s ease" }}
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
              dismiss(t.key);
            }}
            className="text-gray-300 hover:text-gray-500 text-lg leading-none"
          >
            ×
          </button>
        </a>
      ))}
      <style>{`@keyframes dcSlideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:none}}`}</style>
    </div>
  );
}
