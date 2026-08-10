import type { Metadata } from "next";
import { STORE } from "@/lib/config";

export const metadata: Metadata = { title: "রিটার্ন পলিসি" };

export default function ReturnPolicyPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">রিটার্ন ও রিফান্ড পলিসি</h1>
      <div className="space-y-3 text-gray-700 leading-relaxed text-sm">
        <p>
          পণ্য হাতে পাওয়ার পর যদি ভুল বা ত্রুটিপূর্ণ পণ্য পান, তাহলে <b>২৪ ঘণ্টার</b> মধ্যে আমাদের
          জানান। আমরা পণ্য পরিবর্তন করে দেব।
        </p>
        <p>
          রিটার্নের ক্ষেত্রে পণ্য অব্যবহৃত ও আসল প্যাকেজিং-সহ থাকতে হবে। ব্যবহৃত পণ্য রিটার্ন গ্রহণযোগ্য
          নয়।
        </p>
        <p>
          রিটার্ন বা এক্সচেঞ্জ সংক্রান্ত যেকোনো প্রয়োজনে যোগাযোগ করুন: 📞 {STORE.phone} · ✉️{" "}
          {STORE.email}।
        </p>
      </div>
    </div>
  );
}
