// GET /admin/orders/[id]/label — renders the CarryBee shipping label (POD) as a
// printable HTML page (68mm / 3in×4in) with a CODE128 barcode, and auto-prints.
// Data comes from CarryBee's Print-POD API, laid out in DreamComfort's own label design.
// Protected by the /admin middleware (admins only).
import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { fetchPrintPod } from "@/lib/carrybee";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function esc(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function truncateToLines(text: string, maxLines: number, charsPerLine = 50): string {
  const t = String(text || "");
  const lines = t.split("\n").slice(0, maxLines);
  let result = lines.join("\n");
  const maxChars = maxLines * charsPerLine;
  if (result.length > maxChars) result = result.slice(0, maxChars).replace(/\s+$/, "") + "...";
  else if (t.split("\n").length > maxLines) result = result.replace(/\s+$/, "") + "...";
  return result;
}

// Native 48mm x 75mm thermal label — minimal DreamComfort design. Pure black on white so
// it prints crisp on monochrome thermal printers. Two codes:
//   • the CarryBee barcode (consignment id) for the courier,
//   • a QR with our order number (e.g. "DC-12785") — scanned at Admin → Returns when a
//     returned parcel comes back.
const POD_STYLES = `
* { box-sizing: border-box; margin: 0; padding: 0; }
@page { size: 48mm 75mm; margin: 0; }
html, body { width: 48mm; background: #fff; }
body { font-family: "Noto Sans Bengali", Arial, Helvetica, sans-serif; color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.lb { width: 48mm; height: 74.5mm; padding: 2mm 2mm 1.6mm; display: flex; flex-direction: column; line-height: 1.1; page-break-after: always; overflow: hidden; }
.lb:last-child { page-break-after: auto; }
.lb-head { text-align: center; padding-bottom: 1.2mm; border-bottom: 0.8pt solid #000; overflow: hidden; }
.lb-brand { display: inline-block; font-family: Arial, Helvetica, sans-serif; font-size: 11pt; font-weight: 700; letter-spacing: 0.2pt; white-space: nowrap; }
.lb-code { text-align: center; padding: 2mm 0 1.8mm; }
svg.pod-barcode { display: block; width: 100%; height: 11mm; margin: 0 auto; }
.lb-cid { font-family: "Courier New", monospace; font-size: 8pt; font-weight: 700; letter-spacing: 0.8pt; margin-top: 0.4mm; }
.lb-to { border-top: 0.8pt solid #000; padding-top: 1.6mm; }
.lb-name { font-size: 13pt; font-weight: 700; line-height: 1.15; overflow-wrap: anywhere; max-height: 2.32em; overflow: hidden; }
.lb-phone { font-family: Arial, Helvetica, sans-serif; font-size: 15pt; font-weight: 700; letter-spacing: 1.3pt; margin-top: 0.8mm; white-space: nowrap; }
.lb-order { margin-top: auto; display: flex; gap: 2mm; align-items: center; border-top: 0.8pt solid #000; padding-top: 1.8mm; }
.lb-qr { width: 21mm; height: 21mm; flex: 0 0 21mm; margin-left: -1mm; }
.lb-qr svg { display: block; width: 100%; height: 100%; }
.lb-oinfo { min-width: 0; flex: 1; }
.lb-tag { font-size: 6.5pt; font-weight: 700; }
.lb-ono { font-family: Arial, Helvetica, sans-serif; font-size: 11.5pt; font-weight: 800; letter-spacing: -0.1pt; margin-top: 0.2mm; }
.lb-items { font-size: 6.5pt; line-height: 1.2; margin-top: 0.6mm; max-height: 3.6em; overflow: hidden; word-break: break-word; }
.lb-foot { text-align: center; font-family: Arial, Helvetica, sans-serif; font-size: 6pt; font-weight: 700; letter-spacing: 0.4pt; margin-top: 1.4mm; }`;

/** BD mobile as 01XXX-XXXXXX — drops a leading +88 / 88 / 0088 country code. */
function prettyPhone(raw: string): string {
  let d = String(raw || "").replace(/\D/g, "");
  if (d.startsWith("0088")) d = d.slice(4);
  else if (d.startsWith("88")) d = d.slice(2);
  if (d.length === 10 && d.startsWith("1")) d = "0" + d;
  if (d.length === 11) return d.slice(0, 5) + "-" + d.slice(5);
  return d || String(raw || "");
}

type OurOrder = {
  order_number?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  order_items?: { product_name: string | null; quantity: number | null }[] | null;
};

function buildLabel(business: any, pod: any, ours: OurOrder): string {
  // Prefer CarryBee POD values, but fall back to our own order record (which always has them).
  const name = pod.recipient_name || ours.customer_name || "";
  const phone = prettyPhone(pod.recipient_phone || ours.customer_phone || "");
  const items = (ours.order_items ?? []).filter((it) => it?.product_name);
  const pieces = items.reduce((n, it) => n + (Number(it.quantity) || 0), 0);
  const itemsText = items.length
    ? items.map((it) => `${it.product_name}${Number(it.quantity) > 1 ? " ×" + it.quantity : ""}`).join(", ")
    : String(pod.product_description || "");
  const orderNo = ours.order_number || (pod.merchant_order_id ? String(pod.merchant_order_id) : "");
  const brand = business?.name || "Dream Comfort";

  return (
    '<div class="lb">' +
      '<div class="lb-head"><span class="lb-brand">' + esc(brand) + "</span></div>" +
      '<div class="lb-code">' +
        '<svg class="pod-barcode" data-code="' + esc(pod.consignment_id || "") + '"></svg>' +
        '<div class="lb-cid">' + esc(pod.consignment_id || "") + "</div>" +
      "</div>" +
      '<div class="lb-to">' +
        '<div class="lb-name">' + esc(name) + "</div>" +
        '<div class="lb-phone">' + esc(phone) + "</div>" +
      "</div>" +
      '<div class="lb-order">' +
        '<div class="lb-qr" data-qr="' + esc(orderNo) + '"></div>' +
        '<div class="lb-oinfo">' +
          '<div class="lb-tag">অর্ডার' + (pieces ? " · " + esc(String(pieces)) + " পিস" : "") + "</div>" +
          '<div class="lb-ono">' + esc(orderNo) + "</div>" +
          (itemsText ? '<div class="lb-items">' + esc(truncateToLines(itemsText, 3, 30)) + "</div>" : "") +
        "</div>" +
      "</div>" +
      '<div class="lb-foot">dreamcomfortbd.com</div>' +
    "</div>"
  );
}

/** Draws every barcode + QR, then prints. QR is drawn as plain SVG squares (crisp on thermal). */
const RENDER_SCRIPT =
  "<script>(function(){var printed=false;function draw(){" +
  'try{if(typeof JsBarcode!=="undefined"){document.querySelectorAll("svg.pod-barcode").forEach(function(el){JsBarcode(el, el.getAttribute("data-code"), {format:"CODE128", width:2, height:40, displayValue:false, margin:4, background:"#ffffff", lineColor:"#000000"});});}}catch(e){}' +
  'try{if(typeof qrcode!=="undefined"){document.querySelectorAll("[data-qr]").forEach(function(el){var t=el.getAttribute("data-qr");if(!t)return;var q=qrcode(0,"M");q.addData(t);q.make();var n=q.getModuleCount(),d="";for(var r=0;r<n;r++)for(var c=0;c<n;c++)if(q.isDark(r,c))d+="M"+c+" "+r+"h1v1h-1z";el.innerHTML=\'<svg xmlns="http://www.w3.org/2000/svg" viewBox="-2 -2 \'+(n+4)+" "+(n+4)+\'" shape-rendering="crispEdges"><path d="\'+d+\'" fill="#000"/></svg>\';});}}catch(e){}' +
  // Long names shrink (13pt → 7pt) until they fit in two lines.
  'document.querySelectorAll(".lb-name").forEach(function(el){var pt=13;while(el.scrollHeight>el.clientHeight+1&&pt>7){pt-=0.5;el.style.fontSize=pt+"pt";}});' +
  // The shop name and phone stay on one line: shrink them only if they would not fit.
  'document.querySelectorAll(".lb-brand,.lb-phone").forEach(function(el){var w=el.parentNode.clientWidth,pt=parseFloat(getComputedStyle(el).fontSize)*0.75;el.style.display="inline-block";while(el.scrollWidth>w&&pt>7){pt-=0.5;el.style.fontSize=pt+"pt";}});' +
  "}function go(){if(printed)return;printed=true;var f=document.fonts&&document.fonts.ready?document.fonts.ready:Promise.resolve();f.then(function(){draw();setTimeout(function(){window.focus();window.print();},500);});}" +
  'if(document.readyState==="complete"){go();}else{window.addEventListener("load",go);setTimeout(go,2500);}' +
  "})();</script>";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = getServerSupabase();
  const { data: order } = await supabase
    .from("orders")
    .select("courier, tracking_id, order_number, customer_name, customer_phone, order_items(product_name, quantity)")
    .eq("id", params.id)
    .single();

  if (!order?.tracking_id || order.courier !== "CarryBee") {
    return NextResponse.json({ error: "এই অর্ডারের CarryBee কনসাইনমেন্ট নেই।" }, { status: 400 });
  }

  const pod = await fetchPrintPod(order.tracking_id);
  if (!pod.ok) {
    return new NextResponse(errorPage(pod.error ?? "লেবেল আনতে ব্যর্থ।"), {
      status: 502,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
  if (!pod.orders || pod.orders.length === 0) {
    return new NextResponse(errorPage("এই কনসাইনমেন্টের লেবেল ডেটা পাওয়া যায়নি।"), {
      status: 404,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const labels = pod.orders.map((o) => buildLabel(pod.business, o, order as OurOrder)).join("");
  const html =
    '<!DOCTYPE html><html><head><meta charset="utf-8"><title>CarryBee-' + esc(order.tracking_id) + "</title>" +
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;700&display=swap">' +
    "<style>" + POD_STYLES + "</style></head><body>" + labels +
    '<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>' +
    '<script src="https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js"></script>' +
    RENDER_SCRIPT + "</body></html>";

  return new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function errorPage(msg: string): string {
  return (
    '<!DOCTYPE html><html><head><meta charset="utf-8"><title>CarryBee</title></head>' +
    '<body style="font-family:sans-serif;padding:24px;color:#b00;">' +
    "<h3>লেবেল প্রিন্ট করা যায়নি</h3><p>" + esc(msg) + "</p>" +
    '<p style="color:#666;font-size:14px;">CarryBee-তে অর্ডার পাঠানোর পর আবার চেষ্টা করুন।</p>' +
    "</body></html>"
  );
}
