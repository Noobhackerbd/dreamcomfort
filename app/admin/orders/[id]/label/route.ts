// GET /admin/orders/[id]/label — renders the CarryBee shipping label (POD) as a
// printable HTML page (68mm / 3in×4in) with a CODE128 barcode, and auto-prints.
// Mirrors the CarryBee WooCommerce plugin's Print-POD label exactly.
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

// Native 48mm x 75mm thermal label. Black borders (no gray fills) so it prints
// crisp on monochrome thermal printers, and fonts sized to fill the label.
const POD_STYLES = `
* { box-sizing: border-box; margin: 0; padding: 0; }
@page { size: 48mm 75mm; margin: 0; }
html, body { width: 48mm; }
body { font-family: "Noto Sans Bengali", Arial, Helvetica, sans-serif; color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.pod-label { width: 48mm; height: 74.5mm; padding: 1.2mm 1.5mm; display: flex; flex-direction: column; line-height: 1.08; page-break-after: always; overflow: hidden; }
.pod-label:last-child { page-break-after: auto; }
.pod-barcode-section { text-align: center; margin-bottom: 0.8mm; }
svg.pod-barcode { display: block; width: 100%; height: 9mm; margin: 0 auto; }
.pod-sender-box { display: flex; align-items: center; border: 1pt solid #000; border-radius: 6pt; padding: 0.8mm 1.2mm; margin-bottom: 0.8mm; min-height: 0; overflow: hidden; flex-shrink: 1; }
.pod-sender-logo { width: 7mm; height: 7mm; flex: 0 0 7mm; border-radius: 50%; border: 1.2pt solid #000; display: flex; align-items: center; justify-content: center; margin-right: 1.2mm; font-size: 12pt; font-weight: 700; }
.pod-sender-name { font-size: 11.5pt; font-weight: 700; line-height: 1.05; }
.pod-sender-category { font-size: 9pt; line-height: 1.18; margin-top: 0.6mm; }
.pod-hub-section { display: flex; justify-content: space-between; gap: 1.5mm; border-top: 1pt solid #000; border-bottom: 1pt solid #000; padding: 0.8mm 0; margin-bottom: 0.8mm; }
.pod-hub-label { font-size: 7pt; font-weight: 700; }
.pod-hub-name { font-size: 9pt; font-weight: 700; line-height: 1.05; }
.pod-hub-right { text-align: right; }
.pod-details-row { display: flex; gap: 1mm; margin-bottom: 0.8mm; }
.pod-detail-box { flex: 1; border: 1pt solid #000; border-radius: 4pt; padding: 0.6mm 0.5mm; text-align: center; }
.pod-detail-title { font-size: 7.5pt; font-weight: 700; }
.pod-detail-value { font-size: 14pt; font-weight: 700; white-space: nowrap; line-height: 1.02; }
.pod-detail-value .u { font-size: 8pt; font-weight: 700; }
.pod-id-box { border: 1pt solid #000; border-radius: 4pt; padding: 0.8mm 1.2mm; margin-bottom: 0.8mm; }
.pod-id-title { font-size: 6.5pt; }
.pod-id-value { font-size: 10pt; font-weight: 700; letter-spacing: 0.2pt; }
.pod-recipient-section { border: 1.5pt solid #000; border-radius: 5pt; padding: 2mm 2mm; margin-top: auto; flex-shrink: 0; }
.pod-section-title { font-size: 7.5pt; font-weight: 700; margin-bottom: 1mm; }
.pod-recipient-name { font-size: 12.5pt; font-weight: 700; line-height: 1.1; word-break: break-word; margin-bottom: 0.9mm; }
.pod-recipient-phone { font-size: 12.5pt; font-weight: 700; line-height: 1.12; letter-spacing: 0.3pt; }`;

function buildLabel(business: any, order: any, fallback?: { name?: string; phone?: string }): string {
  const businessInitial = (business?.name || "B").charAt(0).toUpperCase();
  const amount = order.collectable_amount === 0 || order.collectable_amount ? order.collectable_amount : 0;
  // Prefer CarryBee POD values, but fall back to our own order record (which always has them).
  const recipientName = order.recipient_name || fallback?.name || "";
  const recipientPhone = order.recipient_phone || fallback?.phone || "";

  return (
    '<div class="pod-label">' +
      '<div class="pod-barcode-section">' +
        '<svg class="pod-barcode" data-code="' + esc(order.consignment_id || "") + '"></svg>' +
      "</div>" +
      '<div class="pod-sender-box">' +
        '<div class="pod-sender-logo">' + esc(businessInitial) + "</div>" +
        '<div style="flex:1; min-width:0;">' +
          '<div class="pod-sender-name">' + esc(business?.name || "N/A") + "</div>" +
          (order.product_description ? '<div class="pod-sender-category">' + esc(truncateToLines(order.product_description, 6, 38)) + "</div>" : "") +
        "</div>" +
      "</div>" +
      '<div class="pod-details-row">' +
        '<div class="pod-detail-box">' +
          '<div class="pod-detail-title">COD</div>' +
          '<div class="pod-detail-value">' + esc(String(amount)) + "</div>" +
        "</div>" +
        '<div class="pod-detail-box">' +
          '<div class="pod-detail-title">Weight</div>' +
          '<div class="pod-detail-value">' + esc(String(order.weight_in_kilo || 0)) + '<span class="u"> kg</span></div>' +
        "</div>" +
      "</div>" +
      '<div class="pod-id-box">' +
        '<div class="pod-id-title">Consignment ID</div>' +
        '<div class="pod-id-value">' + esc(order.consignment_id || "") + "</div>" +
        (order.merchant_order_id ? '<div class="pod-id-title" style="margin-top:0.6mm;">Merchant Order ID</div><div class="pod-id-value">' + esc(String(order.merchant_order_id)) + "</div>" : "") +
      "</div>" +
      '<div class="pod-recipient-section">' +
        '<div class="pod-section-title">Recipient Details</div>' +
        '<div class="pod-recipient-name">' + esc(recipientName) + "</div>" +
        '<div class="pod-recipient-phone">' + esc(recipientPhone) + "</div>" +
      "</div>" +
    "</div>"
  );
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = getServerSupabase();
  const { data: order } = await supabase
    .from("orders")
    .select("courier, tracking_id, customer_name, customer_phone")
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

  const fallback = { name: order.customer_name as string, phone: order.customer_phone as string };
  const labels = pod.orders.map((o) => buildLabel(pod.business, o, fallback)).join("");
  const html =
    '<!DOCTYPE html><html><head><meta charset="utf-8"><title>CarryBee-' + esc(order.tracking_id) + "</title>" +
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;700&display=swap">' +
    "<style>" + POD_STYLES + "</style></head><body>" + labels +
    '<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>' +
    "<script>(function(){var printed=false;function go(){if(printed)return;printed=true;" +
    'try{if(typeof JsBarcode!=="undefined"){document.querySelectorAll("svg.pod-barcode").forEach(function(el){JsBarcode(el, el.getAttribute("data-code"), {format:"CODE128", width:2, height:40, displayValue:false, margin:8, background:"#ffffff", lineColor:"#000000"});});}}catch(e){}' +
    "setTimeout(function(){window.focus();window.print();},500);}" +
    'if(document.readyState==="complete"){go();}else{window.addEventListener("load",go);setTimeout(go,2000);}' +
    "})();</script></body></html>";

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
