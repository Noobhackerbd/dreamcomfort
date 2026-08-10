import type { Metadata } from "next";
import { STORE } from "@/lib/config";

export const metadata: Metadata = { title: "প্রাইভেসি পলিসি" };

export default function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">প্রাইভেসি পলিসি</h1>
      <div className="space-y-3 text-gray-700 leading-relaxed text-sm">
        <p>
          {STORE.name} আপনার ব্যক্তিগত তথ্যের গোপনীয়তাকে সর্বোচ্চ গুরুত্ব দেয়। অর্ডার প্রক্রিয়া
          করতে আমরা শুধুমাত্র আপনার নাম, মোবাইল নম্বর ও ঠিকানা সংগ্রহ করি।
        </p>
        <p>
          এই তথ্য শুধুমাত্র অর্ডার ডেলিভারি ও গ্রাহক সেবার জন্য ব্যবহৃত হয়। আমরা আপনার তথ্য কোনো
          তৃতীয় পক্ষের কাছে বিক্রি করি না।
        </p>
        <p>
          আমাদের ওয়েবসাইটে মার্কেটিং পরিমাপের জন্য কুকি ও অ্যানালিটিক্স ব্যবহার করা হতে পারে।
          কোনো প্রশ্ন থাকলে যোগাযোগ করুন: {STORE.email}।
        </p>
      </div>
    </div>
  );
}
