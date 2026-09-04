// lib/types.ts

/** A priced product option (color/model), stored in products.variants (jsonb). */
export interface Variant {
  id: string;
  label: string;
  price: number;
  compare_at_price?: number | null;
  image?: string | null;
}

export interface Product {
  id: string;
  slug: string;
  name_en: string;
  name_bn: string | null;
  description_en: string | null;
  description_bn: string | null;
  price: number;
  compare_at_price: number | null;
  sku: string | null;
  stock: number;
  category_id: string | null;
  images: string[] | null;
  variants?: Variant[] | null;
  is_active: boolean;
  meta_title?: string | null;
  meta_description?: string | null;
  rating?: number | null;        // 0–5 (shown as stars on the card)
  review_count?: number | null;  // e.g. 250
}

export interface Category {
  id: string;
  slug: string;
  name_en: string;
  name_bn: string | null;
  sort_order: number;
}

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "returned";

export interface Order {
  id: string;
  order_number: string;
  status: OrderStatus;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  address_line: string;
  area: string | null;
  city: string | null;
  district: string | null;
  postcode: string | null;
  payment_method: "cod";
  subtotal: number;
  shipping_fee: number;
  discount: number;
  total: number;
  notes: string | null;
  courier: string | null;
  tracking_id: string | null;
  event_id: string | null;
  created_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  unit_price: number;
  quantity: number;
  line_total: number;
}
