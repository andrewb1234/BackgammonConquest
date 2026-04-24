import { useGameStore } from "../store/useGameStore";

/**
 * WaitingView — Beacon Broadcast.
 *
 * Per §7.2 — a sector code centred inside a pair of counter-rotating
 * orbital rings, with a pulsing "awaiting combatant" indicator. Designed
 * to read as an active standby state rather than a loading screen.
 */
export default function WaitingView() {
  const sectorCode = useGameStore((s) => s.sectorCode);

  return (
    <div
      data-testid="view-waiting"
      className="relative w-full min-h-[60vh] flex flex-col items-center justify-center gap-10"
    >
      <div className="absolute inset-0 hologram-grid opacity-20 pointer-events-none" />
      <div className="absolute inset-0 scanline opacity-15 pointer-events-none" />

      <div className="relative z-10 text-center">
        <p className="telemetry-warm mb-2 animate-pulse">// BEACON ACTIVE //</p>
        <h2 className="font-headline font-black text-2xl sm:text-3xl tracking-[0.25em] uppercase text-secondary-container">
          Awaiting Combatant
        </h2>
        <p className="font-body text-sm text-on-surface-variant mt-2 max-w-md mx-auto">
          Transmit the sector beacon to a second operator. This archon will
          remain on standby until an uplink is received.
        </p>
      </div>

      {/* Orbital sigil containing the sector code */}
      <div className="relative z-10 w-64 h-64 flex items-center justify-center text-secondary-container">
        <div className="orbital-ring" />
        <div className="orbital-ring-inner" />
        <div className="relative w-44 h-44 bg-surface-container border-2 border-secondary-container flex flex-col items-center justify-center corner-brackets text-secondary-container shadow-[0_0_40px_rgba(253,139,0,0.35)]">
          <span className="cb-bl" />
          <span className="cb-br" />
          <div className="absolute inset-0 hologram-grid opacity-20 pointer-events-none" />
          <span className="font-label text-[10px] tracking-[0.4em] uppercase text-secondary mb-1">
            Sector
          </span>
          <span
            data-testid="sector-code"
            className="relative font-headline font-black text-2xl sm:text-3xl tracking-[0.35em] text-tertiary-fixed crt-glow"
          >
            {sectorCode ?? "——————"}
          </span>
          <span className="font-label text-[9px] tracking-[0.3em] uppercase text-on-surface-variant/60 mt-2">
            Beacon · Locked
          </span>
        </div>
      </div>

      {/* Pulse status */}
      <div className="relative z-10 flex items-center gap-3 font-headline uppercase tracking-[0.25em] text-[11px] text-on-surface-variant">
        <span className="w-2 h-2 bg-secondary-container animate-pulse" />
        Scanning for combatant
        <span className="w-2 h-2 bg-secondary-container animate-pulse" />
      </div>
    </div>
  );
}
