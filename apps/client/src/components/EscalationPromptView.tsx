import { useEffect } from "react";
import { useGameStore } from "../store/useGameStore";
import type { PlayerRole } from "@backgammon-conquest/shared";
import { playEscalation } from "../services/sounds";

/**
 * EscalationPromptView — Priority-1 Interrupt.
 *
 * Per §7.7 — signature UI state of the game. Central holographic cube with
 * counter-rotating orbital rings, glitch-text headline, ambient telemetry
 * rails, scrolling warning ticker, and ACCEPT / RETREAT buttons. The whole
 * view should read as an emergency system halt.
 */
export default function EscalationPromptView() {
  const gameState = useGameStore((s) => s.gameState);
  const clientId = useGameStore((s) => s.clientId);
  const sendGameIntent = useGameStore((s) => s.sendGameIntent);

  const escalation = gameState?.battle?.escalation;
  const myRole = gameState?.players.find((p) => p.playerId === clientId)?.role as
    | PlayerRole
    | undefined;
  const isController = escalation?.controllerPlayerId === clientId;
  const isResponder = !isController;

  useEffect(() => {
    playEscalation();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const currentMultiplier = escalation?.multiplier ?? 1;
  const nextMultiplier = currentMultiplier * 2;

  const invokerRole: PlayerRole = isController
    ? myRole!
    : myRole === "HOST"
      ? "GUEST"
      : "HOST";
  const invokerFaction = invokerRole === "HOST" ? "Iron Hegemony" : "Solar Covenant";

  return (
    <div
      data-testid="view-escalation"
      className="relative w-full min-h-[70vh] flex flex-col items-center justify-center gap-10 py-6"
    >
      {/* Overlay washes */}
      <div className="absolute inset-0 scanline opacity-30 pointer-events-none" />
      <div className="absolute inset-0 hologram-grid opacity-20 pointer-events-none" />
      <div className="absolute inset-y-0 left-0 w-32 edge-wash-left pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-32 edge-wash-right pointer-events-none" />

      {/* Headline */}
      <div className="relative z-10 text-center">
        <div className="flex items-center justify-center gap-4 mb-2">
          <span className="text-secondary-container text-3xl sm:text-4xl font-headline font-black animate-pulse">
            !
          </span>
          <h1 className="font-headline font-black text-2xl sm:text-4xl md:text-5xl tracking-[0.2em] uppercase text-secondary-container glitch-text">
            Planetary Stakes Increasing
          </h1>
          <span className="text-secondary-container text-3xl sm:text-4xl font-headline font-black animate-pulse">
            !
          </span>
        </div>
        <p className="font-headline uppercase tracking-[0.35em] text-[11px] sm:text-xs text-secondary opacity-80">
          Protocol: THE ULTIMATUM · Status: ACTIVE
        </p>
      </div>

      {/* Central sigil + ambient rails */}
      <div className="relative z-10 w-72 h-72 sm:w-80 sm:h-80 flex items-center justify-center text-secondary-container">
        <div className="orbital-ring" />
        <div className="orbital-ring-inner" />

        <div className="relative w-44 h-44 sm:w-48 sm:h-48 bg-surface-container-lowest border-2 border-secondary-container flex flex-col items-center justify-center corner-brackets shadow-[0_0_60px_rgba(253,139,0,0.35)] backdrop-blur-md">
          <span className="cb-bl" />
          <span className="cb-br" />
          <div className="absolute inset-0 hologram-grid opacity-20 pointer-events-none" />
          <span
            data-testid="escalation-multiplier"
            data-multiplier={nextMultiplier}
            className="relative font-headline font-black text-6xl sm:text-7xl text-secondary-container glitch-text-soft"
          >
            ×{nextMultiplier}
          </span>
          <span className="relative font-label text-[10px] tracking-[0.4em] uppercase text-secondary/70 mt-1">
            Multiplier Active
          </span>
        </div>

        {/* Right telemetry rail */}
        <div className="hidden md:block absolute -right-36 top-1/2 -translate-y-1/2 space-y-2 text-left pointer-events-none">
          <p className="telemetry">STAKE_VECTOR: 0.9928</p>
          <p className="telemetry">THREAT_LEVEL: CRITICAL</p>
          <p className="telemetry">CORE_TEMP: 4500K</p>
        </div>
        {/* Left telemetry rail */}
        <div className="hidden md:block absolute -left-36 top-1/2 -translate-y-1/2 space-y-2 text-right pointer-events-none">
          <p className="telemetry-warm">INVOKER: {invokerFaction.toUpperCase()}</p>
          <p className="telemetry-warm">PROTOCOL: ULTIMATUM</p>
          <p className="telemetry-warm">SCRAP_POOL: STABLE</p>
        </div>
      </div>

      {/* Action row OR controller-wait */}
      <div className="relative z-10 w-full max-w-2xl px-6">
        {isController ? (
          <div className="corner-brackets text-secondary-container bg-surface-container/80 border border-outline-variant p-6 text-center">
            <span className="cb-bl" />
            <span className="cb-br" />
            <p className="font-headline uppercase tracking-[0.25em] text-sm text-secondary mb-2">
              Ultimatum transmitted
            </p>
            <p className="font-body text-sm text-on-surface-variant">
              Awaiting enemy archon's response. Stakes hold at{" "}
              <span className="text-tertiary font-headline">
                ×{currentMultiplier}
              </span>{" "}
              until received.
            </p>
          </div>
        ) : isResponder ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              data-testid="btn-escalation-accept"
              onClick={() =>
                sendGameIntent("INTENT_RESPOND_ESCALATION", { response: "ACCEPT" })
              }
              className="btn-archon-secondary w-full flex flex-col items-center gap-1 py-5"
            >
              <span className="font-black text-lg">Accept Ultimatum</span>
              <span className="font-label text-[10px] tracking-[0.25em] text-on-secondary-fixed/70">
                Stakes double · Control passes to you
              </span>
            </button>
            <button
              data-testid="btn-escalation-retreat"
              onClick={() =>
                sendGameIntent("INTENT_RESPOND_ESCALATION", { response: "RETREAT" })
              }
              className="btn-archon-caution w-full flex flex-col items-center gap-1 py-5"
            >
              <span className="font-black text-lg">Tactical Retreat</span>
              <span className="font-label text-[10px] tracking-[0.25em] text-error/70">
                Lose node · Salvage scrap reserves
              </span>
            </button>
          </div>
        ) : null}
      </div>

      {/* Warning ticker */}
      <div className="absolute bottom-4 inset-x-0 warning-ticker-host bg-secondary-container/10 py-1 border-y border-secondary-container/30 pointer-events-none">
        <div className="flex gap-12 whitespace-nowrap animate-ticker-scroll">
          {Array.from({ length: 6 }).map((_, i) => (
            <span
              key={i}
              className="font-headline text-[11px] font-bold text-secondary-container tracking-[0.15em] uppercase"
            >
              CAUTION: HIGH STAKES DETECTED · SYST_OVERLOAD: ESCL_PRTCL_09 · OPERATOR DISCRETION ADVISED ·
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
