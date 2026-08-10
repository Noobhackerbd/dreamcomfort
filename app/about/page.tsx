import type { Metadata } from "next";
import { STORE } from "@/lib/config";

export const metadata: Metadata = {
  title: "আমাদের সম্পর্কে",
  description: `${STORE.name} — বাংলাদেশের আরামদায়ক ঘরোয়া পণ্যের বিশ্বস্ত অনলাইন দোকান।`,
};

export default function AboutPage() {
  return (
    <div className="max-w-2xl mx-auto prose-p:my-3">
      <h1 className="text-2xl font-bold mb-4">আমাদের সম্পর্কে</h1>
      <p className="text-gray-700 leading-relaxed">
        {STORE.name} বাংলাদেশের একটি বিশ্বস্ত অনলাইন দোকান, যেখানে আমরা মানসম্পন্ন বিছানাপত্র,
        বালিশ, কুশন ও ঘরের আরামদায়ক পণ্য সাশ্রয়ী দামে সরবরাহ করি। আমাদের লক্ষ্য প্রতিটি ঘরে আরাম
        পৌঁছে দেওয়া।
      </p>
      <p className="text-gray-700 leading-relaxed mt-4">
        আমরা সারা বাংলাদেশে <b>ক্যাশ অন ডেলিভারি</b> সুবিধা দিই — অর্ডার করার সময় কোনো অগ্রিম
        পেমেন্ট লাগে না। পণ্য হাতে পেয়ে টাকা পরিশোধ করুন।
      </p>
      <p className="text-gray-700 leading-relaxed mt-4">
        কোনো প্রশ্ন থাকলে আমাদের সাথে যোগাযোগ করুন: 📞 {STORE.phone} · ✉️ {STORE.email}
      </p>
    </div>
  );
}
