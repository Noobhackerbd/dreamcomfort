"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { taka } from "@/lib/format";
import { createManualOrder, parseOrderScreenshot } from "./actions";

export interface PickProduct {
  id: string;
  name: string;
  price: number;
  image: string | null;
}

export interface ManualInitial {
  name?: string;
  phone?: string;
  address?: string;
  area?: string;
  city?: string;
  productId?: string;
  amount?: number;
}

export function ManualOrderModal({
  products,
  aiReady,
  initial,
  leadId,
  triggerLabel,
  triggerClassName,
}: {
  products: PickProduct[];
  aiReady: boolean;
  initial?: ManualInitial;
  leadId?: string;
  triggerLabel?: string;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={triggerClassName || "rounded-lg bg-brand text-white px-4 py-2.5 text-sm font-medium hover:bg-brand-dark"}
      >
        {triggerLabel || "➕ নতুন অর্ডার"}
      </button>
      {open && <Modal products={products} aiReady={aiReady} initial={initial} leadId={leadId} onClose={() => setOpen(false)} />}
    </>
  );
}

function Modal({
  products,
  aiReady,
  initial,
  leadId,
  onClose,
}: {
  products: PickProduct[];
  aiReady: boolean;
  initial?: ManualInitial;
  leadId?: string;
  onClose: () => void;
}) {
  const router = useRouter();

  const [name, setName] = useState(initial?.name ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [area, setArea] = useState(initial?.area ?? "");
  const [city, setCity] = useState(initial?.city ?? "");
  const [notes, setNotes] = useState("");

  const [productId, setProductId] = useState<string>(
    (initial?.productId && products.some((p) => p.id === initial.productId) ? initial.productId : products[0]?.id) ?? ""
  );
  const [qty, setQty] = useState("1");
  const [customAmount, setCustomAmount] = useState(initial?.amount ? String(initial.amount) : "");
  const [shipping, setShipping] = useState("0");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [booked, setBooked] = useState(false);
  const [bookedDate, setBookedDate] = useState("");

  const [aiBusy, setAiBusy] = useState(false);
  const [aiMsg, setAiMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const selected = products.find((p) => p.id === productId) || null;
  const cls = "w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand";
  const lbl = "block text-xs font-medium text-gray-500 mb-1";

  const computedTotal =
    (Number(customAmount) || 0) > 0
      ? Number(customAmount)
      : (selected ? selected.price * (Number(qty) || 1) : 0) + (Number(shipping) || 0);

  // Downscale + re-encode the screenshot to a small JPEG so the Server Action
  // payload stays tiny (fast + never hits the body-size limit) and the AI reads faster.
  async function shrinkImage(file: File): Promise<{ base64: string; mediaType: string }> {
    const dataUrl: string = await new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result as string);
      r.onerror = () => rej(new Error("ফাইল পড়া যায়নি।"));
      r.readAsDataURL(file);
    });
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const im = new window.Image();
      im.onload = () => res(im);
      im.onerror = () => rej(new Error("ছবি লোড হয়নি।"));
      im.src = dataUrl;
    });
    const MAX = 1568; // Anthropic's optimal long-edge for vision
    let { width, height } = img;
    if (width > MAX || height > MAX) {
      const scale = MAX / Math.max(width, height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return { base64: dataUrl.split(",")[1], mediaType: file.type || "image/jpeg" };
    ctx.drawImage(img, 0, 0, width, height);
    const out = canvas.toDataURL("image/jpeg", 0.82);
    return { base64: out.split(",")[1], mediaType: "image/jpeg" };
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting same file
    if (!file) return;
    setAiMsg(null); setErr(null); setAiBusy(true);
    try {
      const { base64, mediaType } = await shrinkImage(file);
      const res = await parseOrderScreenshot(base64, mediaType);
      setAiBusy(false);
      if (!res.ok || !res.data) { setAiMsg(null); setErr(res.error ?? "AI পড়তে পারেনি।"); return; }
      const d = res.data;
      if (d.name) setName(d.name);
      if (d.phone) setPhone(d.phone);
      if (d.address) setAddress(d.address);
      if (d.area) setArea(d.area);
      if (d.city) setCity(d.city);
      if (d.note) setNotes(d.note);
      setAiMsg("AI তথ্য পূরণ করেছে ✓ — যাচাই করে পণ্য ও দাম নির্বাচন করুন।");
    } catch (e: any) {
      setAiBusy(false);
      setErr(e?.message ?? "ছবি পড়া যায়নি।");
    }
  }

  async function submit() {
    setErr(null);
    if (!productId) return setErr("পণ্য নির্বাচন করুন।");
    if (booked && !bookedDate) return setErr("বুকড অর্ডারের ডেলিভারি তারিখ দিন।");
    setBusy(true);
    const res = await createManualOrder({
      name,
      phone,
      address,
      area,
      city,
      notes,
      items: [{ productId, qty: Math.max(1, Math.floor(Number(qty) || 1)) }],
      customAmount: Number(customAmount) || 0,
      shippingFee: Number(shipping) || 0,
      status: "pending",
      sendSms: false,
      isBooked: booked,
      bookedDate: booked ? bookedDate : null,
      leadId,
    });
    setBusy(false);
    if (!res.ok) return setErr(res.error ?? "ব্যর্থ।");
    onClose();
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-[80] bg-black/50 flex items-start justify-center overflow-y-auto p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl my-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h3 className="font-bold text-lg">নতুন অর্ডার (ম্যানুয়াল / AI)</h3>
          <button onClick={onClose} className="text-gray-400 text-xl">×</button>
        </div>

        <div className="p-5 space-y-4">
          {/* AI screenshot */}
          <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-medium text-purple-800">
                🤖 AI দিয়ে অর্ডার পড়ুন
              </div>
              <label className={"rounded-lg px-3 py-1.5 text-xs font-medium cursor-pointer " + (aiReady ? "bg-purple-600 text-white hover:bg-purple-700" : "bg-gray-200 text-gray-400 cursor-not-allowed")}>
                {aiBusy ? "পড়ছে..." : "📷 স্ক্রিনশট আপলোড"}
                <input type="file" accept="image/*" className="hidden" disabled={!aiReady || aiBusy} onChange={onFile} />
              </label>
            </div>
            <p className="mt-1 text-[11px] text-purple-700/80">
              {aiReady
                ? "মেসেঞ্জার/হোয়াটসঅ্যাপ অর্ডারের স্ক্রিনশট দিন — নাম, ফোন ও ঠিকানা স্বয়ংক্রিয়ভাবে পূরণ হবে।"
                : "AI ব্যবহার করতে Settings → AI অর্ডার রিডার-এ Anthropic API key দিন।"}
            </p>
            {aiMsg && <p className="mt-1 text-xs text-green-700">{aiMsg}</p>}
          </div>

          {/* Customer */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className={lbl}>নাম *</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className={cls} />
            </div>
            <div>
              <label className={lbl}>ফোন *</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="numeric" placeholder="01XXXXXXXXX" className={cls} />
            </div>
            <div className="sm:col-span-2">
              <label className={lbl}>ঠিকানা *</label>
              <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} className={cls} />
            </div>
            <div>
              <label className={lbl}>এলাকা</label>
              <input value={area} onChange={(e) => setArea(e.target.value)} className={cls} />
            </div>
            <div>
              <label className={lbl}>শহর / জেলা</label>
              <input value={city} onChange={(e) => setCity(e.target.value)} className={cls} />
            </div>
          </div>

          {/* Product picker with images */}
          <div>
            <label className={lbl}>পণ্য *</label>
            <button type="button" onClick={() => setPickerOpen((v) => !v)} className={cls + " flex items-center gap-3 text-left"}>
              {selected ? (
                <>
                  <span className="relative h-9 w-9 rounded-md overflow-hidden bg-gray-100 shrink-0">
                    {selected.image && <Image src={selected.image} alt="" fill sizes="36px" className="object-cover" />}
                  </span>
                  <span className="flex-1 min-w-0 truncate">{selected.name}</span>
                  <span className="text-accent-dark font-semibold">{taka(selected.price)}</span>
                </>
              ) : (
                <span className="text-gray-400">পণ্য নির্বাচন করুন</span>
              )}
              <span className="text-gray-400">▾</span>
            </button>
            {pickerOpen && (
              <div className="mt-1 max-h-60 overflow-y-auto rounded-lg border bg-white shadow-lg divide-y">
                {products.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => { setProductId(p.id); setPickerOpen(false); }}
                    className={"w-full flex items-center gap-3 px-3 py-2 text-left text-sm hover:bg-gray-50 " + (p.id === productId ? "bg-brand/5" : "")}
                  >
                    <span className="relative h-9 w-9 rounded-md overflow-hidden bg-gray-100 shrink-0">
                      {p.image && <Image src={p.image} alt="" fill sizes="36px" className="object-cover" />}
                    </span>
                    <span className="flex-1 min-w-0 truncate">{p.name}</span>
                    <span className="text-accent-dark font-semibold">{taka(p.price)}</span>
                  </button>
                ))}
                {products.length === 0 && <p className="px-3 py-3 text-sm text-gray-400">কোনো পণ্য নেই।</p>}
              </div>
            )}
          </div>

          {/* Qty / amounts */}
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className={lbl}>পরিমাণ</label>
              <input value={qty} onChange={(e) => setQty(e.target.value.replace(/[^\d]/g, ""))} inputMode="numeric" className={cls} />
            </div>
            <div>
              <label className={lbl}>ডেলিভারি চার্জ (৳)</label>
              <input value={shipping} onChange={(e) => setShipping(e.target.value.replace(/[^\d.]/g, ""))} inputMode="decimal" className={cls} />
            </div>
            <div>
              <label className={lbl}>কাস্টম মোট (৳)</label>
              <input value={customAmount} onChange={(e) => setCustomAmount(e.target.value.replace(/[^\d.]/g, ""))} inputMode="decimal" placeholder="ঐচ্ছিক" className={cls} />
            </div>
          </div>

          {/* Booked / scheduled order */}
          <div className="rounded-lg border border-amber-200 bg-amber-50/50 px-4 py-2.5">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={booked} onChange={(e) => setBooked(e.target.checked)} className="h-4 w-4 accent-amber-500" />
              📅 বুকড অর্ডার (গ্রাহক পরে ডেলিভারি নিতে চান)
            </label>
            {booked && (
              <div className="mt-2 flex items-center gap-2">
                <label className="text-xs text-gray-600">ডেলিভারি তারিখ:</label>
                <input type="date" value={bookedDate} onChange={(e) => setBookedDate(e.target.value)} className="rounded-lg border px-3 py-1.5 text-sm" />
                <span className="text-[11px] text-amber-700">তারিখের ৩ দিন আগে থেকে রিমাইন্ডার পাবেন।</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end rounded-lg bg-cream-deep/50 px-4 py-2.5">
            <span className="text-sm">সর্বমোট: <b className="text-accent-dark">{taka(computedTotal)}</b></span>
          </div>

          {err && <p className="text-sm text-red-600">{err}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t px-5 py-3">
          <button onClick={onClose} className="rounded-lg border px-5 py-2 text-sm">বাতিল</button>
          <button onClick={submit} disabled={busy} className="rounded-lg bg-brand text-white px-5 py-2 text-sm font-medium hover:bg-brand-dark disabled:opacity-60">
            {busy ? "তৈরি হচ্ছে..." : "অর্ডার তৈরি করুন (পেন্ডিং)"}
          </button>
        </div>
      </div>
    </div>
  );
}
