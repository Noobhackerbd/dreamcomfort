import type { Metadata } from "next";
import { STORE } from "@/lib/config";

export const metadata: Metadata = { title: "শর্তাবলী" };

export default function TermsPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">শর্তাবলী</h1>
      <div className="space-y-3 text-gray-700 leading-relaxed text-sm">
        <p>{STORE.name} থেকে অর্ডার করার মাধ্যমে আপনি নিচের শর্তাবলীতে সম্মত হচ্ছেন।</p>
        <p>
          সকল পণ্যের দাম বাংলাদেশি টাকায় (৳) প্রদর্শিত। অর্ডার নিশ্চিত করার আগে আমরা ফোনে যোগাযোগ
          করে অর্ডার যাচাই করি।
        </p>
        <p>
          ডেলিভারি চার্জ এলাকা অনুযায়ী নির্ধারিত হয়। পণ্য হাতে পেয়ে ক্যাশ অন ডেলিভারিতে মূল্য
          পরিশোধ করতে হবে।
        </p>
        <p>
          স্টক সীমাবদ্ধতা বা অন্য কারণে আমরা যেকোনো অর্ডার বাতিল করার অধিকার সংরক্ষণ করি — সেক্ষেত্রে
          আপনাকে জানানো হবে।
        </p>
      </div>
    </div>
  );
}
