// lib/landing.ts — landing/funnel page config (stored in settings 'landing').
import { getServerSupabase } from "@/lib/supabase/server";

export interface LandingReview {
  name: string;
  text: string;
  stars: number;
  image?: string;
}

export interface LandingBenefit {
  icon: string;
  title: string;
  text: string;
}

export interface LandingConfig {
  productSlug: string; // legacy single-product (kept for back-compat)
  productSlugs: string[]; // products featured on the landing (in order)
  logoUrl: string;
  headline: string;
  subheadline: string;
  heroImages: string[];
  badges: string[];
  benefits: LandingBenefit[];
  guaranteeTitle: string;
  guaranteeText: string;
  reviews: LandingReview[];
  ctaText: string;
  urgencyText: string;
  statText: string;
}

export const DEFAULT_LANDING: LandingConfig = {
  productSlug: "",
  productSlugs: [],
  logoUrl: "/logo.png",
  headline: "মায়ের আরামের প্রেগন্যান্সি পিলো 🤰",
  subheadline: "সারা রাত আরামে ঘুমান — পিঠ, কোমর ও পায়ের ব্যথা থেকে মুক্তি। মা ও শিশুর প্রতিটি মুহূর্তে আরাম।",
  heroImages: [],
  badges: ["ক্যাশ অন ডেলিভারি", "সারা দেশে ফ্রি ডেলিভারি", "৩ দিনের মানিব্যাক গ্যারান্টি"],
  benefits: [
    { icon: "🛌", title: "আরামদায়ক ঘুম", text: "সঠিক পজিশনে ঘুমানোর পূর্ণ সাপোর্ট" },
    { icon: "💪", title: "ব্যথা কমায়", text: "পিঠ ও কোমরের চাপ ৮০% পর্যন্ত কমায়" },
    { icon: "🤰", title: "গর্ভবতী মায়েদের জন্য", text: "প্রেগন্যান্সিতে বিশেষভাবে উপযোগী" },
    { icon: "🌿", title: "প্রিমিয়াম ও নিরাপদ", text: "নরম, টেকসই ও স্কিন-ফ্রেন্ডলি ম্যাটেরিয়াল" },
  ],
  guaranteeTitle: "৩ দিনের মানিব্যাক গ্যারান্টি",
  guaranteeText: "পণ্য পছন্দ না হলে ৩ দিনের মধ্যে ফেরত দিন — কোনো প্রশ্ন ছাড়াই সম্পূর্ণ টাকা ফেরত।",
  reviews: [
    { name: "Sadia R.", text: "গর্ভাবস্থায় রাতে ঘুমাতে খুব কষ্ট হতো। এই পিলো ব্যবহারের পর অনেক আরাম পাচ্ছি।", stars: 5 },
    { name: "Nusrat J.", text: "কোমরের ব্যথা অনেক কমেছে। কাপড়ও খুব নরম। ধন্যবাদ Dream Comfort!", stars: 5 },
    { name: "Tania A.", text: "দ্রুত ডেলিভারি পেয়েছি, ক্যাশ অন ডেলিভারিতে অর্ডার করেছি। মান দারুণ।", stars: 5 },
  ],
  ctaText: "অর্ডার কনফার্ম করুন",
  urgencyText: "🔥 সীমিত স্টক — আজই অর্ডার করুন!",
  statText: "৫০০০+ সন্তুষ্ট মা",
};

export async function getLandingConfig(): Promise<LandingConfig> {
  try {
    const supabase = getServerSupabase();
    const { data } = await supabase.from("settings").select("value").eq("key", "landing").single();
    if (data?.value) return { ...DEFAULT_LANDING, ...(data.value as Partial<LandingConfig>) };
  } catch {
    /* settings table not present yet */
  }
  return DEFAULT_LANDING;
}
