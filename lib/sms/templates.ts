// lib/sms/templates.ts — editable SMS templates (Bangla). Placeholders:
//   {name}  {order}  {total}  {tracking}  {link} (our own tracking page for this order)
// Admin Settings can override these; DEFAULT_SMS_TEMPLATES is the fallback.

export interface SmsTemplates {
  order_placed: string;
  confirmed: string;
  shipped: string;
  delivered: string;
}

export type SmsTemplateKey = keyof SmsTemplates;

export const DEFAULT_SMS_TEMPLATES: SmsTemplates = {
  order_placed:
    "প্রিয় {name}, আপনার অর্ডার {order} গ্রহণ করা হয়েছে। মোট {total} টাকা (ক্যাশ অন ডেলিভারি)। ধন্যবাদ - Dream Comfort",
  confirmed:
    "প্রিয় {name}, আপনার অর্ডার {order} কনফার্ম করা হয়েছে। ট্র্যাক করুন: {link} - Dream Comfort",
  shipped:
    "প্রিয় {name}, আপনার অর্ডার {order} কুরিয়ারে পাঠানো হয়েছে। ট্র্যাক করুন: {link} - Dream Comfort",
  delivered:
    "প্রিয় {name}, আপনার অর্ডার {order} ডেলিভার করা হয়েছে। আমাদের সাথে থাকার জন্য ধন্যবাদ! - Dream Comfort",
};

export interface TemplateVars {
  name?: string;
  order?: string;
  total?: string | number;
  tracking?: string;
  link?: string;
}

/** Fill {placeholders} in a template string. */
export function fillTemplate(template: string, vars: TemplateVars): string {
  return template
    .replace(/\{name\}/g, vars.name ?? "")
    .replace(/\{order\}/g, vars.order ?? "")
    .replace(/\{total\}/g, vars.total != null ? String(vars.total) : "")
    .replace(/\{tracking\}/g, vars.tracking ?? "")
    .replace(/\{link\}/g, vars.link ?? "")
    .trim();
}

/** Which order statuses trigger an SMS, and which template each uses. */
export const STATUS_SMS_MAP: Partial<Record<string, SmsTemplateKey>> = {
  confirmed: "confirmed",
  shipped: "shipped",
  delivered: "delivered",
};

/**
 * Confirmed / shipped SMS always carry the tracking link. A template saved before {link}
 * existed gets it added before the "- Dream Comfort" sign-off (or at the end).
 */
export function withTrackLink(template: string, key: string): string {
  if (!["confirmed", "shipped"].includes(key) || template.includes("{link}")) return template;
  const signOff = /\s*[-–—]\s*Dream Comfort\s*$/i;
  return signOff.test(template)
    ? template.replace(signOff, " ট্র্যাক করুন: {link} - Dream Comfort")
    : `${template.trim()} ট্র্যাক করুন: {link}`;
}
