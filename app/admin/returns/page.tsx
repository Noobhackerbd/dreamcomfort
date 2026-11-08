import { ReturnsDesk } from "./ReturnsDesk";

export const dynamic = "force-dynamic";

export default function ReturnsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">রিটার্ন রিসিভ</h1>
      <p className="text-sm dc-muted mb-5">
        কুরিয়ার রিটার্ন বললে অর্ডার এখানে আসে। পার্সেল হাতে পেলে লেবেলের QR স্ক্যান করুন — তখনই “রিসিভ হয়েছে” হবে।
      </p>
      <ReturnsDesk />
    </div>
  );
}
