"use client";

import { useEffect, useState } from "react";
import { isMuted, setMuted, playTick } from "@/lib/sound";

/** Small floating mute/unmute button for the funnel's sound effects. */
export function SoundToggle() {
  const [muted, setM] = useState(false);
  useEffect(() => setM(isMuted()), []);

  return (
    <button
      aria-label={muted ? "সাউন্ড চালু করুন" : "সাউন্ড বন্ধ করুন"}
      onClick={() => {
        const next = !muted;
        setMuted(next);
        setM(next);
        if (!next) playTick();
      }}
      className="no-print fixed bottom-24 right-3 z-40 h-11 w-11 rounded-full bg-white/90 backdrop-blur shadow-soft border border-brand/20 flex items-center justify-center text-lg hover:scale-105 transition lg:bottom-4"
      title={muted ? "সাউন্ড বন্ধ" : "সাউন্ড চালু"}
    >
      {muted ? "🔇" : "🔊"}
    </button>
  );
}
