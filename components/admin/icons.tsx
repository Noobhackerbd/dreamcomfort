// components/admin/icons.tsx — clean line-icon set for the admin panel (professional
// look, replaces emoji). Stroke-based, inherits currentColor, 24px grid.

import type { SVGProps } from "react";

const base = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const PATHS: Record<string, React.ReactNode> = {
  dashboard: (<><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></>),
  landing: (<><path d="M4 4h16v6H4z" /><path d="M4 14h7v6H4z" /><path d="M14 14h6v6h-6z" /></>),
  products: (<><path d="M3.3 7 12 3l8.7 4-8.7 4z" /><path d="M3.3 7v10L12 21l8.7-4V7" /><path d="M12 11v10" /></>),
  categories: (<><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>),
  orders: (<><path d="M6 2h9l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" /><path d="M14 2v5h5" /><path d="M8.5 12h7M8.5 16h7" /></>),
  print: (<><path d="M6 9V3h12v6" /><rect x="4" y="9" width="16" height="8" rx="1.5" /><path d="M8 17h8v4H8z" /><circle cx="17" cy="12.5" r="0.6" fill="currentColor" /></>),
  abandoned: (<><circle cx="9" cy="20" r="1.3" /><circle cx="17" cy="20" r="1.3" /><path d="M2 3h2l2.4 12.2a1 1 0 0 0 1 .8h9.2a1 1 0 0 0 1-.8L20 7H6" /></>),
  customers: (<><circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><path d="M16 3.5a3.2 3.2 0 0 1 0 6.2" /><path d="M18 14.2c1.8.8 3 2.6 3 4.8" /></>),
  workers: (<><path d="M4 21a8 8 0 0 1 16 0" /><path d="M6 11a6 6 0 0 1 12 0" /><path d="M4 11h16" /><circle cx="12" cy="6" r="1.2" /></>),
  sms: (<><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3.5 7 8.5 6 8.5-6" /></>),
  tracking: (<><path d="M3 12h4l2.5 6 4-15 2.5 9h5" /></>),
  settings: (<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 7 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7H1a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 2.6 7a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 7 2.6h.1A1.6 1.6 0 0 0 9 1.1V1a2 2 0 1 1 4 0v.1A1.6 1.6 0 0 0 15 2.6a1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7h.2a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.4 1z" /></>),
  logout: (<><path d="M15 4h3a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-3" /><path d="M10 17l-5-5 5-5" /><path d="M5 12h11" /></>),
  menu: (<><path d="M4 7h16M4 12h16M4 17h16" /></>),
  close: (<><path d="M6 6l12 12M18 6L6 18" /></>),
  search: (<><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></>),
  sun: (<><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>),
  moon: (<><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></>),
  chevronRight: (<><path d="m9 6 6 6-6 6" /></>),
  chevronDown: (<><path d="m6 9 6 6 6-6" /></>),
  phone: (<><path d="M6.6 10.8a13 13 0 0 0 6.6 6.6l2-2a1.2 1.2 0 0 1 1.3-.3 9 9 0 0 0 3 .5 1.2 1.2 0 0 1 1.2 1.2V20a1.2 1.2 0 0 1-1.2 1.2A17 17 0 0 1 2.8 4.2 1.2 1.2 0 0 1 4 3h2.9a1.2 1.2 0 0 1 1.2 1.2 9 9 0 0 0 .5 3 1.2 1.2 0 0 1-.3 1.3z" /></>),
  chat: (<><path d="M21 11.5a8 8 0 0 1-11.6 7.1L3 20l1.4-4.2A8 8 0 1 1 21 11.5z" /></>),
  edit: (<><path d="M12 20h9" /><path d="M16.5 3.5a2 2 0 0 1 3 3L7 19l-4 1 1-4z" /></>),
  truck: (<><rect x="1" y="6" width="14" height="10" rx="1" /><path d="M15 9h4l3 3v4h-7z" /><circle cx="6" cy="18" r="1.6" /><circle cx="18" cy="18" r="1.6" /></>),
  refresh: (<><path d="M21 12a9 9 0 1 1-3-6.7L21 8" /><path d="M21 3v5h-5" /></>),
  plus: (<><path d="M12 5v14M5 12h14" /></>),
  check: (<><path d="M20 6 9 17l-5-5" /></>),
  clock: (<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>),
  box: (<><path d="M3.3 7 12 3l8.7 4-8.7 4z" /><path d="M3.3 7v10L12 21l8.7-4V7" /></>),
  money: (<><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /><path d="M6 9v.01M18 15v.01" /></>),
  eye: (<><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>),
  target: (<><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" /></>),
  tag: (<><path d="M20.5 13.5 13 21a1.4 1.4 0 0 1-2 0L3 13V4a1 1 0 0 1 1-1h9l7.5 7.5a1.4 1.4 0 0 1 0 2z" /><circle cx="7.5" cy="7.5" r="1.2" /></>),
  trend: (<><path d="M3 17l6-6 4 4 8-8" /><path d="M17 7h4v4" /></>),
  map: (<><path d="M9 3 3 5v16l6-2 6 2 6-2V3l-6 2-6-2z" /><path d="M9 3v16M15 5v16" /></>),
  bell: (<><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></>),
};

export function Icon({ name, ...props }: { name: string } & SVGProps<SVGSVGElement>) {
  const path = PATHS[name] ?? PATHS.dashboard;
  return (
    <svg {...base} {...props} aria-hidden="true">
      {path}
    </svg>
  );
}

export type IconName = keyof typeof PATHS;
