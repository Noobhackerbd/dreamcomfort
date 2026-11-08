import { SmsSettings } from "./SmsSettings";

export const dynamic = "force-dynamic";

export default function AdminSmsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">SMS</h1>
      <p className="text-sm dc-muted mb-5">অর্ডার কনফার্ম, Shipped ইত্যাদি হলে গ্রাহককে SMS যায় কিনা, আর কোন SMS গেল বা আটকাল — সব এখানে।</p>
      <SmsSettings />
    </div>
  );
}
