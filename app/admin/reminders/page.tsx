import { ReminderSettings } from "./ReminderSettings";

export const dynamic = "force-dynamic";

export default function AdminRemindersPage() {
  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold mb-1">রিমাইন্ডার</h1>
      <p className="text-sm dc-muted mb-5">Messenger / WhatsApp-এ কাস্টমার উত্তর না দিলে চ্যাটবট নিজে থেকে যে মেসেজগুলো পাঠায় — কখন যাবে, কী লেখা যাবে, আর কাকে কাকে গেল।</p>
      <ReminderSettings />
    </div>
  );
}
