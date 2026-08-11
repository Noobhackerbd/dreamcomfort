"use client";

import { useMemo } from "react";

// Clean, symmetric heart (Material "favorite" path).
const HEART_PATH =
  "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z";

/** Premium floating hearts — vertical rise + organic horizontal sway + depth blur. */
export function HeartsBg({ count = 7 }: { count?: number }) {
  const hearts = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => {
        const left = (i * 41 + 7) % 100;
        const size = 14 + ((i * 17) % 26); // 14–40px
        const rise = 12 + ((i * 5) % 11); // 12–23s (slow, smooth)
        const sway = 3.5 + ((i * 7) % 30) / 10; // 3.5–6.5s
        const delay = (i * 2.3) % 14;
        const depth = (i % 3) as 0 | 1 | 2; // 0 near … 2 far
        const opacity = depth === 0 ? 0.5 : depth === 1 ? 0.35 : 0.22;
        const blur = depth === 0 ? 0 : depth === 1 ? 0.6 : 1.4;
        const grad = i % 2 === 0 ? "dcGradA" : "dcGradB";
        return { i, left, size, rise, sway, delay, opacity, blur, grad };
      }),
    [count]
  );

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden z-0">
      <svg width="0" height="0" className="absolute">
        <defs>
          <linearGradient id="dcGradA" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#7FC3E8" />
            <stop offset="1" stopColor="#F0A0C0" />
          </linearGradient>
          <linearGradient id="dcGradB" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#F0A0C0" />
            <stop offset="1" stopColor="#7FC3E8" />
          </linearGradient>
        </defs>
      </svg>

      {hearts.map((h) => (
        <span
          key={h.i}
          className="dc-rise"
          style={{
            left: `${h.left}%`,
            animationDuration: `${h.rise}s`,
            animationDelay: `${h.delay}s`,
            ["--o" as any]: h.opacity,
          }}
        >
          <span
            className="dc-sway"
            style={{ animationDuration: `${h.sway}s`, animationDelay: `${h.delay}s` }}
          >
            <svg
              width={h.size}
              height={h.size}
              viewBox="0 0 24 24"
              style={{ display: "block", willChange: "transform" }}
            >
              <path d={HEART_PATH} fill={`url(#${h.grad})`} />
            </svg>
          </span>
        </span>
      ))}
    </div>
  );
}
