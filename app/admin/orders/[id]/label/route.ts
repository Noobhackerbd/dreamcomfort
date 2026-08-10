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

const POD_STYLES = `
* { box-sizing: border-box; margin: 0; padding: 0; }
@page { size: 3in 4in; margin: 3mm; }
body { font-family: "Noto Sans Bengali", Arial, Helvetica, sans-serif; font-size: 10pt; color: #333; margin: 0; padding: 8px; }
.pod-label { width: 68mm; margin: 0 auto 6mm; display: flex; flex-direction: column; line-height: 1.15; page-break-after: always; }
.pod-label:last-child { page-break-after: auto; }
.pod-header { display: flex; justify-content: space-between; align-items: center; }
.pod-logo { font-size: 14pt; font-weight: 700; color: #000; flex: 0 0 auto; }
.pod-logo .pod-logo-accent { color: #f6b800; }
.pod-trust { font-size: 8pt; font-weight: 700; color: #000; text-align: right; line-height: 1.2; white-space: nowrap; }
.pod-barcode-section { text-align: center; }
svg.pod-barcode { display: block; width: 100%; height: 23pt; margin: 0 auto; }
.pod-sender-box { display: flex; align-items: center; border: 1.5pt solid #eaeaea; border-radius: 12pt; padding: 3pt 6pt; margin-bottom: 3pt; }
.pod-sender-logo { width: 28pt; height: 28pt; flex: 0 0 28pt; border-radius: 50%; border: 1pt solid #000; display: flex; align-items: center; justify-content: center; margin-right: 6pt; font-size: 12pt; font-weight: 700; color: #000; }
.pod-sender-name { font-size: 12pt; font-weight: 700; margin-bottom: 1pt; }
.pod-sender-label { font-size: 8pt; color: #757575; margin-bottom: 1pt; }
.pod-sender-category { font-size: 8pt; color: #757575; }
.pod-hub-section { display: flex; justify-content: space-between; border: 1pt solid #f2f2f2; border-radius: 8pt; padding: 2pt 6pt; margin-bottom: 3pt; }
.pod-hub-right { text-align: right; }
.pod-hub-name { font-size: 9.5pt; font-weight: 700; }
.pod-details-row { display: flex; gap: 4pt; margin-bottom: 4pt; }
.pod-detail-box { flex: 1; background: #f8f8f8; border-radius: 5pt; padding: 3pt; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.pod-detail-title { font-size: 9pt; font-weight: 700; color: #333; margin-bottom: 1pt; }
.pod-detail-value { font-size: 13.5pt; font-weight: 700; white-space: nowrap; }
.pod-id-box { flex: 1.3; background: #f8f8f8; border-radius: 5pt; padding: 3pt 5pt; display: flex; flex-direction: column; justify-content: center; }
.pod-id-title { font-size: 7pt; color: #777; margin-bottom: 1pt; white-space: nowrap; }
.pod-id-value { font-size: 10pt; font-weight: 700; margin-bottom: 2pt; }
.pod-id-value:last-child { margin-bottom: 0; }
.pod-recipient-section { margin-bottom: 2pt; }
.pod-section-title { font-size: 9.5pt; font-weight: 700; color: #000; margin-bottom: 1pt; }
.pod-recipient-name { font-size: 12pt; font-weight: 700; margin-bottom: 1pt; }
.pod-recipient-phone { font-size: 11pt; font-weight: 700; margin-bottom: 1pt; }
.pod-recipient-address { font-size: 9.5pt; line-height: 1.25; }
.pod-special-section { border-top: 1pt solid #000; padding-top: 3pt; margin-top: 3pt; }
.pod-special-text { font-size: 9.5pt; line-height: 1.2; color: #000; }
.pod-footer { display: flex; justify-content: space-between; padding-top: 2pt; margin-top: auto; }
.pod-footer-text { font-size: 9pt; color: #555; }
@media print {
  body { padding: 2.5mm; }
  .pod-label { width: 100%; height: 88mm; margin: 0; overflow: hidden; }
}`;

function buildLabel(business: any, order: any): string {
  const created = order.created_at ? new Date(order.created_at) : new Date();
  const formattedDate = !isNaN(created.getTime())
    ? created.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit", hour12: true })
    : "";
  const businessInitial = (business?.name || "B").charAt(0).toUpperCase();
  const amount = order.collectable_amount === 0 || order.collectable_amount ? order.collectable_amount : 0;

  return (
    '<div class="pod-label">' +
      '<div class="pod-header">' +
        '<div class="pod-logo">Carry<span class="pod-logo-accent">Bee</span></div>' +
        '<div class="pod-trust">Trusted by merchant across<br>Bangladesh</div>' +
      "</div>" +
      '<div class="pod-barcode-section">' +
        '<svg class="pod-barcode" data-code="' + esc(order.consignment_id || "") + '"></svg>' +
      "</div>" +
      '<div class="pod-sender-box">' +
        '<div class="pod-sender-logo">' + esc(businessInitial) + "</div>" +
        '<div style="flex:1;">' +
          '<div class="pod-sender-name">' + esc(business?.name || "N/A") + "</div>" +
          '<div class="pod-sender-label">' + esc(order.store_name || "") + "</div>" +
          (order.product_description ? '<div class="pod-sender-category">' + esc(order.product_description) + "</div>" : "") +
        "</div>" +
      "</div>" +
      '<div class="pod-hub-section">' +
        "<div>" +
          '<div class="pod-hub-name">PickUp Hub</div>' +
          '<div class="pod-hub-name">' + esc(order.pickup_hub_name || "N/A") + "</div>" +
        "</div>" +
        '<div class="pod-hub-right">' +
          '<div class="pod-hub-name">Delivery Hub</div>' +
          '<div class="pod-hub-name">' + esc(order.delivery_hub_name || "N/A") + "</div>" +
        "</div>" +
      "</div>" +
      '<div class="pod-details-row">' +
        '<div class="pod-detail-box">' +
          '<div class="pod-detail-title">COD</div>' +
          '<div class="pod-detail-value">' + esc(String(amount)) + "</div>" +
        "</div>" +
        '<div class="pod-detail-box">' +
          '<div class="pod-detail-title">Weight</div>' +
          '<div class="pod-detail-value">' + esc(String(order.weight_in_kilo || 0)) + " kg</div>" +
        "</div>" +
        '<div class="pod-id-box">' +
          '<div class="pod-id-title">Consignment ID</div>' +
          '<div class="pod-id-value">' + esc(order.consignment_id || "") + "</div>" +
          (order.merchant_order_id ? '<div class="pod-id-title">Merchant Order ID</div><div class="pod-id-value">' + esc(String(order.merchant_order_id)) + "</div>" : "") +
        "</div>" +
      "</div>" +
      '<div class="pod-recipient-section">' +
        '<div class="pod-section-title">Recipient Details</div>' +
        '<div class="pod-recipient-name">' + esc(order.recipient_name || "") + "</div>" +
        '<div class="pod-recipient-phone">' + esc(order.recipient_phone || "") + "</div>" +
        '<div class="pod-section-title">Recipient Address</div>' +
        '<div class="pod-recipient-address">' + esc(truncateToLines(order.recipient_address || "Address not provided", 1, 45)) + "</div>" +
      "</div>" +
      (order.special_instruction
        ? '<div class="pod-special-section">' +
            '<div class="pod-section-title">Special Description</div>' +
            '<div class="pod-special-text">' + esc(truncateToLines(order.special_instruction, 3)) + "</div>" +
          "</div>"
        : "") +
      '<div class="pod-footer">' +
        '<div class="pod-footer-text">' + esc(formattedDate) + "</div>" +
        '<div class="pod-footer-text">www.carrybee.com</div>' +
      "</div>" +
    "</div>"
  );
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = getServerSupabase();
  const { data: order } = await supabase
    .from("orders")
    .select("courier, tracking_id")
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

  const labels = pod.orders.map((o) => buildLabel(pod.business, o)).join("");
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
