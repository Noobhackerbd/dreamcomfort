// lib/sms/templates.ts — editable SMS templates (Bangla). Placeholders:
//   {name}  {order}  {total}  {tracking}
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
    "প্রিয় {name}, আপনার অর্ডার {order} কনফার্ম করা হয়েছে। শীঘ্রই ডেলিভারি করা হবে। - Dream Comfort",
  shipped:
    "প্রিয় {name}, আপনার অর্ডার {order} কুরিয়ারে পাঠানো হয়েছে। ট্র্যাকিং: {tracking}। - Dream Comfort",
  delivered:
    "প্রিয় {name}, আপনার অর্ডার {order} ডেলিভার করা হয়েছে। আমাদের সাথে থাকার জন্য ধন্যবাদ! - Dream Comfort",
};

export interface TemplateVars {
  name?: string;
  order?: string;
  total?: string | number;
  tracking?: string;
}

/** Fill {placeholders} in a template string. */
export function fillTemplate(template: string, vars: TemplateVars): string {
  return template
    .replace(/\{name\}/g, vars.name ?? "")
    .replace(/\{order\}/g, vars.order ?? "")
    .replace(/\{total\}/g, vars.total != null ? String(vars.total) : "")
    .replace(/\{tracking\}/g, vars.tracking ?? "")
    .trim();
}

/** Which order statuses trigger an SMS, and which template each uses. */
export const STATUS_SMS_MAP: Partial<Record<string, SmsTemplateKey>> = {
  confirmed: "confirmed",
  shipped: "shipped",
  delivered: "delivered",
};
