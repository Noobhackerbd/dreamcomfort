import { PrintStation } from "./PrintStation";
import { PrintStationGate } from "./PrintStationGate";

export const dynamic = "force-dynamic";

export default function PrintStationPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">🖨️ Print Station</h1>
      <p className="text-sm dc-muted mb-5">Keep this page open on the laptop that has the label printer connected.</p>

      <PrintStationGate>
        <PrintStation />

        <div className="mt-6 max-w-2xl dc-card p-5 text-sm">
          <h2 className="font-bold mb-2">⚙️ Silent auto-print setup (one-time)</h2>
          <ol className="list-decimal pl-5 space-y-1.5" style={{ color: "var(--a-muted)" }}>
            <li>Set the label printer as the <b>default printer</b> in Windows (Settings → Printers).</li>
            <li>Right-click the Chrome icon → Properties → at the end of <b>Target</b>, add a space then: <code className="px-1 rounded" style={{ background: "var(--a-surface-2)" }}>--kiosk-printing</code></li>
            <li>Open Chrome with that shortcut and keep this <b>Print Station</b> page open.</li>
            <li>Now when any order is confirmed — from any device — the label prints <b>by itself</b> (no dialog).</li>
          </ol>
          <p className="mt-3 text-xs dc-muted">
            <b>Note:</b> without <code className="px-1 rounded" style={{ background: "var(--a-surface-2)" }}>--kiosk-printing</code> a print dialog appears for each label (you just press Print). That&apos;s a browser security rule — silent print only works in kiosk mode. Make sure the <b>&ldquo;Auto-send to CarryBee on confirm&rdquo;</b> option is enabled in Settings.
          </p>
        </div>
      </PrintStationGate>
    </div>
  );
}
