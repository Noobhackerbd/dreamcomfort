"use client";

// components/admin/ThemeToggle.tsx — light/dark switch for the admin panel only.
// Sets data-theme on the .admin-shell root and persists to localStorage. A tiny
// inline script in the layout applies the saved theme before paint (no flash).

import { useEffect, useState } from "react";
import { Icon } from "./icons";

const KEY = "dc:admin-theme";

function apply(theme: "light" | "dark") {
  const shell = document.querySelector(".admin-shell");
  if (shell) shell.setAttribute("data-theme", theme);
}

export function ThemeToggle({ compact }: { compact?: boolean }) {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    let saved: "light" | "dark" = "light";
    try { saved = (localStorage.getItem(KEY) as any) || "light"; } catch {}
    setTheme(saved);
    apply(saved);
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    apply(next);
    try { localStorage.setItem(KEY, next); } catch {}
  }

  return (
    <button
      onClick={toggle}
      className="dc-iconbtn inline-flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm"
      title={theme === "dark" ? "লাইট মোড" : "ডার্ক মোড"}
      aria-label="Toggle theme"
    >
      <Icon name={theme === "dark" ? "sun" : "moon"} className="h-4 w-4" />
      {!compact && <span>{theme === "dark" ? "Light" : "Dark"}</span>}
    </button>
  );
}
