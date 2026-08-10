// lib/config.ts — store settings. Values here are sensible defaults; the admin
// Settings + Landing pages can override most of them at runtime.

export const STORE = {
  name: "Dream Comfort",
  nameBn: "ড্রিম কমফোর্ট",
  tagline: "মা ও শিশুর প্রতিটি মুহূর্তে আরাম ও নিরাপত্তা",
  phone: "01887864604",
  whatsapp: "01887864604",
  email: "support@dreamcomfortbd.com",
  facebook: "https://facebook.com/dreamcomfortbd",
  instagram: "https://instagram.com/dreamcomfortbd",
  address: "সিরাজগঞ্জ, বাংলাদেশ",
};

export const STORE_NAME = STORE.name;

// Cash-on-Delivery shipping fees (BDT). Admin Settings can override these.
// Default to free delivery to match the live funnel; set fees in admin if needed.
export const SHIPPING = {
  insideDhaka: 0,
  outsideDhaka: 0,
};

export const DELIVERY_CHARGE = SHIPPING.insideDhaka;
export const CURRENCY = "BDT";

export type DeliveryArea = "inside" | "outside";

export function shippingFeeFor(area: DeliveryArea): number {
  return area === "outside" ? SHIPPING.outsideDhaka : SHIPPING.insideDhaka;
}
