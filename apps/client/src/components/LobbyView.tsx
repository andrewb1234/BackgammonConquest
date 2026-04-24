import { useState } from "react";
import { useGameStore } from "../store/useGameStore";

/**
 * LobbyView — Operator Boot Terminal.
 *
 * The first stage the player sees. Per AESTHETIC_NARRATIVE.md §7.1 the
 * composition is a single hero corner-bracketed panel containing the primary
 * CTAs, flanked by ambient telemetry rails that fake fleet status chatter.
 */
export default function LobbyView() {
  const createSession = useGameStore((s) => s.createSession);
  const joinSession = useGameStore((s) => s.joinSession);
  const [sectorCode, setSectorCode] = useState("");
  const [mode, setMode] = useState<"choose" | "join">("choose");

  const canConnect = sectorCode.length === 6;

  return (
    <div
      data-testid="view-lobby"
      className="relative w-full flex flex-col items-center justify-center gap-8 py-8 sm:py-12"
    >
      {/* Hologram dot-grid backdrop */}
      <div className="absolute inset-0 hologram-grid opacity-30 pointer-events-none" />
      <div className="absolute inset-0 scanline opacity-20 pointer-events-none" />

      {/* Hero title */}
      <div className="relative z-10 text-center">
        <p className="telemetry-warm mb-2">// BOOT SEQUENCE COMPLETE //</p>
        <h1 className="font-headline font-black text-4xl sm:text-6xl tracking-[0.2em] uppercase text-secondary-container glitch-text">
          VOID-GATE
        </h1>
        <p className="font-headline uppercase tracking-[0.35em] text-[11px] sm:text-sm text-secondary mt-2">
          Hegemony Command Archon · Sector Operations
        </p>
      </div>

      {/* Ambient telemetry rails — hidden on small screens to preserve focus */}
      <AmbientRails />

      {/* Hero control panel */}
      <div
        className="relative z-10 corner-brackets text-secondary-container bg-surface-container/90 border border-outline-variant p-6 sm:p-10 w-full max-w-md"
      >
        <span className="cb-bl" />
        <span className="cb-br" />
        <div className="absolute inset-0 scanline opacity-30 pointer-events-none" />

        {mode === "choose" ? (
          <div className="relative flex flex-col items-center gap-5">
            <h2 className="font-headline font-black text-xl tracking-[0.25em] uppercase text-on-surface">
              Initiate Link
            </h2>
            <p className="font-body text-sm text-on-surface-variant text-center max-w-xs">
              Claim a sector as command archon, or uplink to an existing sector beacon.
            </p>

            <button
              data-testid="btn-create-session"
              onClick={createSession}
              className="btn-archon-secondary w-full"
            >
              Create Sector
            </button>
            <button
              data-testid="btn-open-join"
              onClick={() => setMode("join")}
              className="btn-archon-primary w-full"
            >
              Join Sector
            </button>

            <p className="font-label text-[10px] tracking-[0.3em] uppercase text-on-surface-variant/70 mt-2">
              Two-operator link required · No server state retained
            </p>
          </div>
        ) : (
          <div className="relative flex flex-col items-center gap-5">
            <h2 className="font-headline font-black text-xl tracking-[0.25em] uppercase text-on-surface">
              Sector Uplink
            </h2>
            <p className="font-body text-sm text-on-surface-variant text-center max-w-xs">
              Enter the 6-glyph beacon provided by the sector archon.
            </p>

            <input
              data-testid="input-sector-code"
              type="text"
              value={sectorCode}
              onChange={(e) => setSectorCode(e.target.value.toUpperCase())}
              maxLength={6}
              placeholder="SECTOR CODE"
              className="bg-surface-container-lowest border-2 border-outline-variant focus:border-secondary-container px-4 py-3 text-center text-2xl tracking-[0.4em] text-tertiary font-headline placeholder:text-outline-variant placeholder:tracking-[0.3em] focus:outline-none w-full"
            />

            <div className="flex gap-3 w-full">
              <button
                onClick={() => {
                  setMode("choose");
                  setSectorCode("");
                }}
                className="btn-archon-ghost flex-1"
              >
                Back
              </button>
              <button
                data-testid="btn-join-session"
                onClick={() => canConnect && joinSession(sectorCode)}
                disabled={!canConnect}
                className="btn-archon-primary flex-1"
              >
                Connect
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer tagline */}
      <p className="relative z-10 font-label text-[10px] tracking-[0.4em] uppercase text-on-surface-variant/50 text-center">
        Protocol · Planetary Backgammon · Build 0.1.0
      </p>
    </div>
  );
}

function AmbientRails() {
  return (
    <>
      <div className="hidden lg:block absolute left-6 top-1/2 -translate-y-1/2 space-y-1 text-left pointer-events-none z-0">
        <p className="telemetry">FLEET_STATUS: NOMINAL</p>
        <p className="telemetry">SCRAP_RESERVE: 00000</p>
        <p className="telemetry">PSI_LINK: IDLE</p>
        <p className="telemetry">SECTOR_DRIFT: 0.0013</p>
      </div>
      <div className="hidden lg:block absolute right-6 top-1/2 -translate-y-1/2 space-y-1 text-right pointer-events-none z-0">
        <p className="telemetry-warm">ARCHON: UNCLAIMED</p>
        <p className="telemetry-warm">COMBATANT: AWAITING</p>
        <p className="telemetry-warm">SHIELDS: STANDBY</p>
        <p className="telemetry-warm">BROADCAST: SILENT</p>
      </div>
    </>
  );
}
