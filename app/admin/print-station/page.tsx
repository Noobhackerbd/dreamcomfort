import { PrintStation } from "./PrintStation";
import { PrintStationGate } from "./PrintStationGate";

export const dynamic = "force-dynamic";

export default function PrintStationPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">🖨️ প্রিন্ট স্টেশন</h1>
      <p className="text-sm text-gray-500 mb-6">
        যে ল্যাপটপে লেবেল প্রিন্টার লাগানো, সেখানে এই পেজটি খোলা রাখুন।
      </p>

      <PrintStationGate>
      <PrintStation />

      <div className="mt-6 max-w-2xl rounded-xl border bg-white p-5 text-sm">
        <h2 className="font-semibold mb-2">⚙️ ডায়ালগ ছাড়াই অটো-প্রিন্ট সেটআপ (একবারের কাজ)</h2>
        <ol className="list-decimal pl-5 space-y-1.5 text-gray-700">
          <li>Windows-এ লেবেল প্রিন্টারটিকে <b>ডিফল্ট প্রিন্টার</b> করে দিন (Settings → Printers)।</li>
          <li>Chrome আইকনে রাইট-ক্লিক → Properties → <b>Target</b> এর শেষে একটা স্পেস দিয়ে যোগ করুন: <code className="bg-gray-100 px-1 rounded">--kiosk-printing</code></li>
          <li>ওই শর্টকাট দিয়ে Chrome খুলুন এবং এই <b>প্রিন্ট স্টেশন</b> পেজটি খুলে রাখুন।</li>
          <li>এখন কোনো অর্ডার কনফার্ম হলে — যেকোনো ডিভাইস থেকে — লেবেল <b>নিজে নিজেই</b> প্রিন্ট হয়ে যাবে (কোনো ডায়ালগ ছাড়াই)।</li>
        </ol>
        <p className="mt-3 text-xs text-gray-500">
          <b>দ্রষ্টব্য:</b> <code>--kiosk-printing</code> ছাড়া প্রতিটি লেবেলের জন্য একটি প্রিন্ট ডায়ালগ আসবে (আপনি শুধু Print চাপবেন)। এটি ব্রাউজারের নিরাপত্তা নিয়ম — সাইলেন্ট প্রিন্ট শুধু kiosk মোডে সম্ভব। সেটিংসে <b>“কনফার্ম করলে অটো CarryBee”</b> অপশনটি চালু আছে কিনা নিশ্চিত করুন।
        </p>
      </div>
      </PrintStationGate>
    </div>
  );
}
