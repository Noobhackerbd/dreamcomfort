"use client";

/** Account entry point — opens the login popup (which redirects to /account if
 *  already signed in). Dispatches the global "dc:open-login" event. */
export function AccountButton({ className }: { className?: string }) {
  return (
    <button
      onClick={() => window.dispatchEvent(new Event("dc:open-login"))}
      aria-label="অ্যাকাউন্ট" title="অ্যাকাউন্ট"
      className={className}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-[21px] w-[21px]"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></svg>
    </button>
  );
}
