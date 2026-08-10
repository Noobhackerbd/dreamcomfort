import { getServerSupabase } from "@/lib/supabase/server";
import { ManualSms } from "./ManualSms";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, string> = {
  sent: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
  skipped: "bg-gray-100 text-gray-500",
};

export default async function AdminSms() {
  const supabase = getServerSupabase();
  const { data: logs } = await supabase
    .from("sms_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  const configured = !!process.env.SMS_API_KEY && !!process.env.SMS_SENDER_ID;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">এসএমএস</h1>

      {!configured && (
        <p className="mb-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 px-4 py-2 text-sm">
          SMS গেটওয়ে কনফিগার করা হয়নি। .env এ <code>SMS_API_KEY</code> ও <code>SMS_SENDER_ID</code> যোগ করুন।
          এখন মেসেজগুলো “skipped” হিসেবে লগ হবে।
        </p>
      )}

      <ManualSms />

      <h2 className="font-semibold mb-3">পাঠানো মেসেজের লগ</h2>
      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-3">সময়</th>
              <th className="px-4 py-3">ফোন</th>
              <th className="px-4 py-3">মেসেজ</th>
              <th className="px-4 py-3">অবস্থা</th>
            </tr>
          </thead>
          <tbody>
            {(logs ?? []).map((l: any) => (
              <tr key={l.id} className="border-t align-top">
                <td className="px-4 py-3 whitespace-nowrap text-gray-400">
                  {new Date(l.created_at).toLocaleString("en-GB")}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">{l.phone}</td>
                <td className="px-4 py-3 max-w-md text-gray-600">{l.message}</td>
                <td className="px-4 py-3">
                  <span className={"rounded-full px-2 py-0.5 text-xs " + (STATUS_STYLE[l.status] ?? "bg-gray-100")}>
                    {l.status}
                  </span>
                </td>
              </tr>
            ))}
            {(!logs || logs.length === 0) && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                  এখনও কোনো এসএমএস পাঠানো হয়নি।
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
