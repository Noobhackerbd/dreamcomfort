"use client";

// components/admin/DashboardCharts.tsx — readable dashboard charts (Recharts):
// axes, gridlines, legend and hover tooltips so the numbers are easy to read.

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

type DayRow = {
  day: string;
  total: number;
  count: number;
  delivered: number;
  confirmed: number;
  pending: number;
  cancelled: number;
};
type VisitRow = { day: string; visitors: number };

const fmtDay = (d: string) => (d ? d.slice(8, 10) + "/" + d.slice(5, 7) : "");
const taka = (n: number) => "৳" + Number(n || 0).toLocaleString("en-BD");
const compact = (n: number) => (n >= 1000 ? Math.round(n / 100) / 10 + "k" : String(n));

const AXIS = { fontSize: 11, fill: "#9aa0a6" } as const;
const GRID = "#eef0f2";

/* ---- shared tooltip ---- */
function TipBox({ title, rows }: { title: string; rows: { label: string; value: string; color?: string }[] }) {
  return (
    <div className="rounded-xl border border-black/5 bg-white/95 backdrop-blur shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold mb-1 text-gray-700">{title}</p>
      {rows.map((r, i) => (
        <p key={i} className="flex items-center gap-1.5 text-gray-600">
          {r.color && <span className="h-2 w-2 rounded-sm" style={{ background: r.color }} />}
          <span>{r.label}</span>
          <span className="ml-auto font-medium tabular-nums">{r.value}</span>
        </p>
      ))}
    </div>
  );
}

const STATUS = [
  { key: "delivered", name: "ডেলিভার্ড", color: "#16a34a" },
  { key: "confirmed", name: "কনফার্মড", color: "#3E9BD1" },
  { key: "pending", name: "পেন্ডিং", color: "#f59e0b" },
  { key: "cancelled", name: "বাতিল", color: "#ef4444" },
];

export function OrdersStatusChart({ data }: { data: DayRow[] }) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data} margin={{ top: 6, right: 6, left: -14, bottom: 0 }} barCategoryGap={2}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="day" tickFormatter={fmtDay} tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} minTickGap={26} />
        <YAxis allowDecimals={false} tick={AXIS} tickLine={false} axisLine={false} width={30} />
        <Tooltip
          cursor={{ fill: "rgba(0,0,0,0.04)" }}
          content={({ active, payload, label }) =>
            active && payload && payload.length ? (
              <TipBox
                title={fmtDay(String(label))}
                rows={[
                  ...STATUS.map((s) => ({
                    label: s.name,
                    color: s.color,
                    value: String((payload.find((p) => p.dataKey === s.key)?.value as number) ?? 0),
                  })),
                  { label: "বিক্রি", value: taka((payload[0]?.payload as DayRow)?.total || 0) },
                ]}
              />
            ) : null
          }
        />
        <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: 12, paddingTop: 6 }} />
        {STATUS.map((s, i) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            stackId="a"
            fill={s.color}
            name={s.name}
            radius={i === STATUS.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
            maxBarSize={26}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function RevenueChart({ data }: { data: DayRow[] }) {
  return (
    <ResponsiveContainer width="100%" height={230}>
      <AreaChart data={data} margin={{ top: 6, right: 6, left: -6, bottom: 0 }}>
        <defs>
          <linearGradient id="dc-rev" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3E9BD1" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#3E9BD1" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="day" tickFormatter={fmtDay} tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} minTickGap={26} />
        <YAxis tickFormatter={compact} tick={AXIS} tickLine={false} axisLine={false} width={38} />
        <Tooltip
          cursor={{ stroke: "#3E9BD1", strokeWidth: 1, strokeDasharray: "3 3" }}
          content={({ active, payload, label }) =>
            active && payload && payload.length ? (
              <TipBox title={fmtDay(String(label))} rows={[{ label: "বিক্রি", color: "#3E9BD1", value: taka(payload[0].value as number) }]} />
            ) : null
          }
        />
        <Area type="monotone" dataKey="total" name="বিক্রি" stroke="#3E9BD1" strokeWidth={2} fill="url(#dc-rev)" dot={false} activeDot={{ r: 4 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function VisitorsChart({ data }: { data: VisitRow[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 6, right: 6, left: -14, bottom: 0 }}>
        <defs>
          <linearGradient id="dc-vis" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#E77BA6" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#E77BA6" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="day" tickFormatter={fmtDay} tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} minTickGap={26} />
        <YAxis allowDecimals={false} tickFormatter={compact} tick={AXIS} tickLine={false} axisLine={false} width={30} />
        <Tooltip
          cursor={{ stroke: "#E77BA6", strokeWidth: 1, strokeDasharray: "3 3" }}
          content={({ active, payload, label }) =>
            active && payload && payload.length ? (
              <TipBox title={fmtDay(String(label))} rows={[{ label: "ভিজিটর", color: "#E77BA6", value: String(payload[0].value) }]} />
            ) : null
          }
        />
        <Area type="monotone" dataKey="visitors" name="ভিজিটর" stroke="#E77BA6" strokeWidth={2} fill="url(#dc-vis)" dot={false} activeDot={{ r: 4 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
