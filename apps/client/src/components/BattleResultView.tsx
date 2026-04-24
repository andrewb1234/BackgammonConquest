import { useEffect } from "react";
import { useGameStore } from "../store/useGameStore";
import type { PlayerRole } from "@backgammon-conquest/shared";
import { getPlanet } from "@backgammon-conquest/shared";
import { playVictory, playDefeat } from "../services/sounds";

export default function BattleResultView() {
  const gameState = useGameStore((s) => s.gameState);
  const clientId = useGameStore((s) => s.clientId);
  const sendGameIntent = useGameStore((s) => s.sendGameIntent);

  const battle = gameState?.battle;
  const borneOff = battle?.board.borneOff;
  const contestedNodeId = battle?.contestedNodeId ?? -1;

  // Determine battle winner from borneOff counts
  let winner: PlayerRole | null = null;
  if (borneOff) {
    if (borneOff.HOST === 15) winner = "HOST";
    else if (borneOff.GUEST === 15) winner = "GUEST";
  }

  // If campaignWinner is set, it's a forfeit or campaign-level result
  if (gameState?.campaignWinner) {
    winner = gameState.campaignWinner;
  }

  const myRole = gameState?.players.find((p) => p.playerId === clientId)?.role as PlayerRole | undefined;
  const myPlayer = gameState?.players.find((p) => p.playerId === clientId);
  const isVictor = winner === myRole;
  const factionName = winner === "HOST" ? "Iron Hegemony" : winner === "GUEST" ? "Solar Covenant" : "Unknown";

  // Play victory/defeat sound on mount
  useEffect(() => {
    if (winner && myRole) {
      isVictor ? playVictory() : playDefeat();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const accentColor = isVictor ? "text-tertiary-fixed" : "text-error";
  const headlineText = isVictor ? "Victory" : "Defeat";
  const planetName =
    getPlanet(contestedNodeId)?.name ?? `Node ${contestedNodeId + 1}`;

  return (
    <div
      data-testid="view-battle-result"
      data-outcome={isVictor ? "victory" : "defeat"}
      className="relative w-full min-h-[60vh] flex flex-col items-center justify-center gap-8 py-6"
    >
      <div className="absolute inset-0 hologram-grid opacity-20 pointer-events-none" />
      <div className="absolute inset-0 scanline opacity-20 pointer-events-none" />

      <div className="relative z-10 text-center">
        <p className="telemetry-warm mb-2">// ENGAGEMENT DEBRIEF //</p>
        <h2 className="font-headline font-black text-sm tracking-[0.3em] uppercase text-secondary">
          Planetary Battle · {planetName}
        </h2>
      </div>

      {/* Hero sigil */}
      <div className="relative z-10 w-64 h-64 flex items-center justify-center">
        <div className={`orbital-ring ${isVictor ? "" : "opacity-40"}`} />
        <div className={`orbital-ring-inner ${isVictor ? "" : "opacity-30"}`} />
        <div
          className={`relative w-40 h-40 bg-surface-container-lowest border-2 ${
            isVictor ? "border-tertiary-fixed" : "border-error"
          } flex flex-col items-center justify-center corner-brackets ${accentColor} shadow-[0_0_60px_rgba(253,139,0,0.3)]`}
        >
          <span className="cb-bl" />
          <span className="cb-br" />
          <div className="absolute inset-0 hologram-grid opacity-20 pointer-events-none" />
          <span
            className={`relative font-headline font-black text-3xl tracking-[0.2em] uppercase ${accentColor} glitch-text-soft`}
          >
            {headlineText}
          </span>
          <span className="relative font-label text-[10px] tracking-[0.4em] uppercase opacity-70 mt-1">
            {winner ? factionName : "Unknown"}
          </span>
        </div>
      </div>

      {/* Evac gauges */}
      {borneOff && (
        <div className="relative z-10 grid grid-cols-2 gap-4 w-full max-w-lg px-4">
          <EvacGauge
            label="Iron Hegemony"
            tag="HOST"
            value={borneOff.HOST}
            plate="rust-plate"
            textColor="text-red-100"
          />
          <EvacGauge
            label="Solar Covenant"
            tag="GUEST"
            value={borneOff.GUEST}
            plate="brass-plate"
            textColor="text-amber-100"
          />
        </div>
      )}

      {myPlayer && (
        <div className="relative z-10 font-headline uppercase tracking-[0.3em] text-[11px] text-tertiary">
          Void-Scrap · {String(myPlayer.voidScrap).padStart(3, "0")}
        </div>
      )}

      <button
        onClick={() => sendGameIntent("ACKNOWLEDGE_RESULT", {})}
        className="relative z-10 btn-archon-primary"
        data-testid="btn-acknowledge-result"
      >
        Acknowledge Result
      </button>
    </div>
  );
}

function EvacGauge({
  label,
  tag,
  value,
  plate,
  textColor,
}: {
  label: string;
  tag: string;
  value: number;
  plate: string;
  textColor: string;
}) {
  const pct = Math.min(1, value / 15);
  return (
    <div className="corner-brackets bg-surface-container border border-outline-variant p-3 text-on-surface">
      <span className="cb-bl" />
      <span className="cb-br" />
      <div className="flex items-center justify-between mb-2">
        <span className="font-headline text-[10px] tracking-[0.2em] uppercase text-on-surface-variant">
          {label}
        </span>
        <span className={`font-headline text-xs tracking-widest ${textColor}`}>
          {tag}
        </span>
      </div>
      <div className="h-3 bg-surface-container-lowest overflow-hidden border border-outline-variant">
        <div
          className={plate}
          style={{ width: `${pct * 100}%`, height: "100%" }}
        />
      </div>
      <p className="mt-1 font-headline text-xs tracking-widest text-on-surface-variant">
        EVAC {value}/15
      </p>
    </div>
  );
}
