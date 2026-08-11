"use client";

import { useEffect, useRef, useState } from "react";
import { getPrintQueue, markLabelPrinted, getPrintedProductCounts } from "../orders/actions";

interface LogRow { t: string; msg: string }
interface ProdCount { name: string; image: string | null; count: number }

export function PrintStation() {
  const [auto, setAuto] = useState(true);
  const [queueCount, setQueueCount] = useState(0);
  const [log, setLog] = useState<LogRow[]>([]);
  const [lastCheck, setLastCheck] = useState<string>("—");
  const [products, setProducts] = useState<ProdCount[]>([]);
  const [totalLabels, setTotalLabels] = useState(0);
  const [scopedToday, setScopedToday] = useState(true);
  const printing = useRef(false);
  const processed = useRef<Set<string>>(new Set());
  const autoRef = useRef(auto);
  autoRef.current = auto;

  function addLog(msg: string) {
    setLog((l) => [{ t: new Date().toLocaleTimeString("en-GB"), msg }, ...l].slice(0, 60));
  }

  async function loadCounts() {
    try {
      const res = await getPrintedProductCounts();
      if (res.ok) {
        setProducts(res.products as ProdCount[]);
        setTotalLabels(res.totalLabels);
        setScopedToday(res.scopedToday);
      }
    } catch {}
  }

  /** Load the label in a hidden iframe; the label page auto-prints itself on load. */
  function printLabel(id: string): Promise<void> {
    return new Promise((resolve) => {
      const iframe = document.createElement("iframe");
      Object.assign(iframe.style, { position: "fixed", right: "0", bottom: "0", width: "0", height: "0", border: "0", opacity: "0" });
      iframe.src = `/admin/orders/${id}/label`;
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        setTimeout(() => { try { iframe.remove(); } catch {} resolve(); }, 4000);
      };
      iframe.onload = finish;          // label self-prints on load
      setTimeout(finish, 12000);       // safety timeout
      document.body.appendChild(iframe);
    });
  }

  async function tick() {
    setLastCheck(new Date().toLocaleTimeString("en-GB"));
    if (printing.current) return;
    const res = await getPrintQueue();
    if (!res.ok) return;
    setQueueCount(res.orders.length);
    if (!autoRef.current) return;
    const next = res.orders.find((o: any) => !processed.current.has(o.id));
    if (!next) return;
    printing.current = true;
    processed.current.add(next.id);
    addLog(`🖨️ প্রিন্ট হচ্ছে: ${next.order_number} · ${next.tracking_id}`);
    try {
      await printLabel(next.id);
      await markLabelPrinted(next.id);
      addLog(`✓ প্রিন্ট সম্পন্ন: ${next.order_number}`);
      loadCounts(); // refresh the product tally after each print
    } catch {
      addLog(`⚠️ প্রিন্ট ব্যর্থ: ${next.order_number}`);
      processed.current.delete(next.id); // allow retry next cycle
    } finally {
      printing.current = false;
    }
  }

  useEffect(() => {
    const t = setInterval(tick, 6000);
    tick();
    loadCounts();
    const c = setInterval(loadCounts, 30000); // refresh tally every 30s
    return () => { clearInterval(t); clearInterval(c); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="max-w-2xl">
      <div className={"rounded-xl border p-5 " + (auto ? "border-green-300 bg-green-50" : "border-gray-200 bg-white")}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-bold text-lg">{auto ? "🟢 প্রিন্ট স্টেশন চালু" : "⚪ প্রিন্ট স্টেশন বন্ধ"}</p>
            <p className="text-sm text-gray-600 mt-0.5">
              এই ল্যাপটপে পেজটি খোলা রাখুন — নতুন কনফার্মড CarryBee অর্ডারের লেবেল স্বয়ংক্রিয়ভাবে প্রিন্ট হবে।
            </p>
          </div>
          <button
            onClick={() => setAuto((v) => !v)}
            className={"rounded-lg px-4 py-2 text-sm font-medium " + (auto ? "bg-red-600 text-white" : "bg-green-600 text-white")}
          >
            {auto ? "বন্ধ করুন" : "চালু করুন"}
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-600">
          <span>সারিতে অপেক্ষমাণ: <b>{queueCount}</b></span>
          <span>শেষ চেক: <b>{lastCheck}</b></span>
        </div>
      </div>

      <div className="mt-4 rounded-xl border bg-white p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">
            {scopedToday ? "আজ প্রিন্ট হওয়া পণ্য" : "প্রিন্ট হওয়া পণ্য (সর্বমোট)"}
          </h2>
          <span className="text-sm text-gray-500">মোট লেবেল: <b>{totalLabels}</b></span>
        </div>
        {products.length === 0 ? (
          <p className="text-sm text-gray-400">
            {scopedToday ? "আজ এখনও কোনো পণ্যের লেবেল প্রিন্ট হয়নি।" : "এখনও কোনো পণ্যের লেবেল প্রিন্ট হয়নি।"}
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {products.map((p, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg border bg-gray-50 p-2">
                <div className="h-14 w-14 flex-shrink-0 rounded-md overflow-hidden bg-white border flex items-center justify-center">
                  {p.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-gray-300 text-xl">📦</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium leading-tight line-clamp-2">{p.name}</p>
                  <p className="mt-1 text-2xl font-bold text-brand tabular-nums leading-none">{p.count}</p>
                </div>
              </div>
            ))}
          </div>
        )}
        {scopedToday && (
          <p className="mt-3 text-xs text-gray-400">প্রতি রাত ১২টায় (বাংলাদেশ সময়) কাউন্ট আবার শূন্য থেকে শুরু হবে।</p>
        )}
      </div>

      <div className="mt-4 rounded-xl border bg-white p-4">
        <h2 className="font-semibold mb-2">প্রিন্ট লগ</h2>
        {log.length === 0 ? (
          <p className="text-sm text-gray-400">এখনও কিছু প্রিন্ট হয়নি। নতুন অর্ডার কনফার্ম হলে এখানে দেখাবে।</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {log.map((r, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-gray-400 tabular-nums">{r.t}</span>
                <span>{r.msg}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
