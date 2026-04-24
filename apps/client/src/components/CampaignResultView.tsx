import { useGameStore } from "../store/useGameStore";
import type { PlayerRole } from "@backgammon-conquest/shared";

/**
 * CampaignResultView — Endgame.
 *
 * Per §7.9 — same visual grammar as BattleResultView but scaled up: the
 * hero sigil represents the entire sector, and the node row below reads
 * as the final dominance map.
 */
export default function CampaignResultView() {
  const gameState = useGameStore((s) => s.gameState);
  const clientId = useGameStore((s) => s.clientId);
  const reset = useGameStore((s) => s.reset);

  const winner = gameState?.campaignWinner ?? null;
  const myRole = gameState?.players.find((p) => p.playerId === clientId)?.role as
    | PlayerRole
    | undefined;
  const isVictor = winner === myRole;
  const factionName =
    winner === "HOST"
      ? "Iron Hegemony"
      : winner === "GUEST"
        ? "Solar Covenant"
        : "Unknown";

  const headline = isVictor ? "Galactic Supremacy" : "Total Defeat";
  const accent = isVictor ? "text-tertiary-fixed" : "text-error";

  return (
    <div
      data-testid="view-campaign-result"
      data-outcome={isVictor ? "victory" : "defeat"}
      className="relative w-full min-h-[70vh] flex flex-col items-center justify-center gap-10 py-6"
    >
      <div className="absolute inset-0 hologram-grid opacity-25 pointer-events-none" />
      <div className="absolute inset-0 scanline opacity-25 pointer-events-none" />

      <div className="relative z-10 text-center">
        <p className="telemetry-warm mb-2">// SECTOR ENDGAME //</p>
        <h2 className="font-headline uppercase tracking-[0.3em] text-xs text-secondary">
          Campaign Concluded
        </h2>
      </div>

      {/* Hero sigil */}
      <div className="relative z-10 w-80 h-80 flex items-center justify-center">
        <div className={`orbital-ring ${isVictor ? "" : "opacity-40"}`} />
        <div className={`orbital-ring-inner ${isVictor ? "" : "opacity-30"}`} />
        <div
          className={`relative w-52 h-52 bg-surface-container-lowest border-2 ${
            isVictor ? "border-tertiary-fixed" : "border-error"
          } flex flex-col items-center justify-center corner-brackets ${accent} shadow-[0_0_80px_rgba(253,139,0,0.35)]`}
        >
          <span className="cb-bl" />
          <span className="cb-br" />
          <div className="absolute inset-0 hologram-grid opacity-20 pointer-events-none" />
          <span
            className={`relative font-headline font-black text-3xl sm:text-4xl text-center tracking-[0.15em] uppercase ${accent} glitch-text-soft px-2`}
          >
            {headline}
          </span>
          <span className="relative font-label text-[10px] tracking-[0.4em] uppercase opacity-70 mt-2">
            {winner ? factionName : "Unknown"}
          </span>
        </div>
      </div>

      <p className="relative z-10 font-body text-sm text-on-surface-variant max-w-md text-center">
        {winner
          ? `The ${factionName} has conquered the sector. Capital node captured — enemy stronghold fallen.`
          : "The campaign has ended."}
      </p>

      {/* Final map — mini */}
      <div className="relative z-10 flex items-center justify-center gap-1">
        {gameState?.campaign.nodes.map((node) => {
          const isHost = node.owner === "HOST";
          const isGuest = node.owner === "GUEST";
          const plate = isHost ? "rust-plate" : isGuest ? "brass-plate" : "chrome-plate";
          return (
            <div
              key={node.nodeId}
              className={`w-10 h-10 ${plate} chamfer-panel flex flex-col items-center justify-center font-headline text-[10px] tracking-widest uppercase ${
                isHost ? "text-red-100" : isGuest ? "text-amber-100" : "text-on-surface-variant"
              }`}
            >
              N{node.nodeId + 1}
            </div>
          );
        })}
      </div>

      <button
        onClick={reset}
        data-testid="btn-return-lobby"
        className="relative z-10 btn-archon-secondary"
      >
        Return to Lobby
      </button>
    </div>
  );
}
