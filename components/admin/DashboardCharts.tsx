"use client";

// components/admin/DashboardCharts.tsx — readable dashboard charts (Recharts):
// axes, gridlines, legend and hover tooltips so the numbers are easy to read.

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList,
  ReferenceLine,
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
const avgOf = (arr: number[]) => (arr.length ? arr.reduce((s, n) => s + n, 0) / arr.length : 0);

/** Direct value labels above marks. Few points → label all; many (>16) → only the
 *  peak, so the biggest number is always visible without hover. */
function makeLabel(values: number[], fmt: (v: number) => string = (v) => String(v)) {
  const dense = values.length > 16;
  const max = Math.max(0, ...values);
  return function LabelContent(props: any) {
    const { x, y, width, value } = props;
    if (value == null || value === 0) return null;
    if (dense && value !== max) return null;
    const cx = x + (typeof width === "number" ? width / 2 : 0);
    return (
      <text x={cx} y={y - 5} textAnchor="middle" fontSize={10} fontWeight={700} fill="#5b6270">
        {fmt(value)}
      </text>
    );
  };
}

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
  { key: "delivered", name: "Delivered", color: "#16a34a" },
  { key: "confirmed", name: "Confirmed", color: "#3E9BD1" },
  { key: "pending", name: "Pending", color: "#f59e0b" },
  { key: "cancelled", name: "Cancelled", color: "#ef4444" },
];

export function OrdersStatusChart({ data }: { data: DayRow[] }) {
  const counts = data.map((d) => d.count);
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
                  { label: "Sales", value: taka((payload[0]?.payload as DayRow)?.total || 0) },
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
          >
            {i === STATUS.length - 1 && <LabelList dataKey="count" content={makeLabel(counts)} />}
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function RevenueChart({ data }: { data: DayRow[] }) {
  const totals = data.map((d) => d.total);
  const avg = avgOf(totals);
  return (
    <ResponsiveContainer width="100%" height={230}>
      <AreaChart data={data} margin={{ top: 16, right: 6, left: -6, bottom: 0 }}>
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
              <TipBox title={fmtDay(String(label))} rows={[{ label: "Sales", color: "#3E9BD1", value: taka(payload[0].value as number) }]} />
            ) : null
          }
        />
        {avg > 0 && (
          <ReferenceLine y={avg} stroke="#cbd5e1" strokeDasharray="4 4" ifOverflow="extendDomain"
            label={{ value: "Avg ৳" + compact(Math.round(avg)), position: "insideTopLeft", fontSize: 10, fill: "#94a3b8" }} />
        )}
        <Area type="monotone" dataKey="total" name="Sales" stroke="#3E9BD1" strokeWidth={2} fill="url(#dc-rev)" dot={false} activeDot={{ r: 4 }}>
          <LabelList dataKey="total" content={makeLabel(totals, (v) => compact(v))} />
        </Area>
      </AreaChart>
    </ResponsiveContainer>
  );
}

const hourAmPm = (h: number) => {
  const ap = h < 12 ? "a" : "p";
  let x = h % 12;
  if (x === 0) x = 12;
  return x + ap;
};
const hourLabel12 = (x: number) => { const ap = x < 12 ? "AM" : "PM"; let hr = x % 12; if (hr === 0) hr = 12; return `${hr} ${ap}`; };
const hourRangeBn = (h: number) => `${hourLabel12(h)} – ${hourLabel12((h + 1) % 24)}`;

/** Visitors by time of day — vertical "tower" bars; the peak hour is highlighted. */
export function VisitorsByHourChart({ data, peakHour }: { data: { hour: number; visits: number }[]; peakHour: number }) {
  const vis = data.map((d) => d.visits);
  return (
    <ResponsiveContainer width="100%" height={230}>
      <BarChart data={data} margin={{ top: 16, right: 6, left: -14, bottom: 0 }} barCategoryGap={2}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="hour" tickFormatter={hourAmPm} tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} interval={2} />
        <YAxis allowDecimals={false} tick={AXIS} tickLine={false} axisLine={false} width={30} tickFormatter={compact} />
        <Tooltip
          cursor={{ fill: "rgba(0,0,0,0.04)" }}
          content={({ active, payload }) =>
            active && payload && payload.length ? (
              <TipBox
                title={hourRangeBn((payload[0].payload as { hour: number }).hour)}
                rows={[{ label: "Visits", color: "#6366f1", value: String(payload[0].value) }]}
              />
            ) : null
          }
        />
        <Bar dataKey="visits" name="Visits" radius={[4, 4, 0, 0]} maxBarSize={26}>
          {data.map((d) => (
            <Cell key={d.hour} fill={d.hour === peakHour ? "#16a34a" : "#6366f1"} />
          ))}
          <LabelList dataKey="visits" content={makeLabel(vis)} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function VisitorsChart({ data }: { data: VisitRow[] }) {
  const vis = data.map((d) => d.visitors);
  const avg = avgOf(vis);
  return (
    <ResponsiveContainer width="100%" height={210}>
      <AreaChart data={data} margin={{ top: 16, right: 6, left: -14, bottom: 0 }}>
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
              <TipBox title={fmtDay(String(label))} rows={[{ label: "Visitors", color: "#E77BA6", value: String(payload[0].value) }]} />
            ) : null
          }
        />
        {avg > 0 && (
          <ReferenceLine y={avg} stroke="#cbd5e1" strokeDasharray="4 4" ifOverflow="extendDomain"
            label={{ value: "Avg " + Math.round(avg), position: "insideTopLeft", fontSize: 10, fill: "#94a3b8" }} />
        )}
        <Area type="monotone" dataKey="visitors" name="Visitors" stroke="#E77BA6" strokeWidth={2} fill="url(#dc-vis)" dot={false} activeDot={{ r: 4 }}>
          <LabelList dataKey="visitors" content={makeLabel(vis)} />
        </Area>
      </AreaChart>
    </ResponsiveContainer>
  );
}
