import { DispatchDesk } from "./DispatchDesk";

export const dynamic = "force-dynamic";

export default function DispatchPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">কুরিয়ার হ্যান্ডওভার</h1>
      <p className="text-sm dc-muted mb-5">
        প্রতিদিন কুরিয়ারকে যত পার্সেল দিচ্ছেন, স্ক্যান করে গুনুন। স্ক্যান করলেই অর্ডার Shipped হয়। কুরিয়ার এন্ট্রি না দিলে এখানে আর নোটিফিকেশনে জানানো হবে।
      </p>
      <DispatchDesk />
    </div>
  );
}
