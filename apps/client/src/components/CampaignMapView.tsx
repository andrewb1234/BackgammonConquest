import { useGameStore } from "../store/useGameStore";
import type { NodeOwner, PlayerRole } from "@backgammon-conquest/shared";

const ADJACENCY: Map<number, number[]> = new Map([
  [0, [1]],
  [1, [0, 2]],
  [2, [1, 3]],
  [3, [2, 4]],
  [4, [3, 5]],
  [5, [4, 6]],
  [6, [5]],
]);

/**
 * CampaignMapView — Sector Hologram.
 *
 * Per §7.4 — a full-width dot-grid projection of the seven contested nodes,
 * connected by dashed vector lines. Each node is a chamfered panel whose
 * border/tint reflects ownership; valid attack targets pulse the
 * secondary-container accent.
 */
export default function CampaignMapView() {
  const gameState = useGameStore((s) => s.gameState);
  const clientId = useGameStore((s) => s.clientId);
  const sendGameIntent = useGameStore((s) => s.sendGameIntent);

  const nodes = gameState?.campaign.nodes ?? [];
  const activePlayerId = gameState?.campaign.activePlayerId ?? "";
  const isActive = activePlayerId === clientId;
  const myRole = gameState?.players.find((p) => p.playerId === clientId)?.role as
    | PlayerRole
    | undefined;
  const myScrap = gameState?.players.find((p) => p.playerId === clientId)?.voidScrap ?? 0;

  const hostCount = nodes.filter((n) => n.owner === "HOST").length;
  const guestCount = nodes.filter((n) => n.owner === "GUEST").length;
  const neutralCount = nodes.filter((n) => n.owner === "NEUTRAL").length;

  const canTarget = (node: { nodeId: number; owner: NodeOwner }) => {
    if (!isActive || !myRole) return false;
    if (node.owner === myRole) return false;
    const ownedNodeIds = nodes.filter((n) => n.owner === myRole).map((n) => n.nodeId);
    const adjacentToOwned = ownedNodeIds.flatMap((id) => ADJACENCY.get(id) ?? []);
    return adjacentToOwned.includes(node.nodeId);
  };

  return (
    <div
      data-testid="view-campaign-map"
      className="relative w-full flex flex-col items-center gap-6 py-4"
    >
      <div className="absolute inset-0 hologram-grid opacity-25 pointer-events-none" />
      <div className="absolute inset-0 scanline opacity-15 pointer-events-none" />

      {/* Brief header */}
      <div className="relative z-10 w-full flex items-end justify-between px-2">
        <div>
          <p className="telemetry-warm mb-1">// SECTOR BRIEF //</p>
          <h2 className="font-headline font-black text-2xl sm:text-3xl tracking-[0.2em] uppercase text-secondary-container">
            Planetary Theatre
          </h2>
        </div>
        <div className="text-right hidden sm:block">
          <p className="telemetry">TURN_TOKEN: {isActive ? "OURS" : "ENEMY"}</p>
          <p className="telemetry">VOID_SCRAP: {String(myScrap).padStart(3, "0")}</p>
        </div>
      </div>

      {/* Ownership gauge — rust/neutral/brass */}
      <div
        className="relative z-10 w-full max-w-2xl flex items-stretch h-6 chamfer-panel border border-outline-variant overflow-hidden"
        title={`HOST ${hostCount} · NEUTRAL ${neutralCount} · GUEST ${guestCount}`}
      >
        {hostCount > 0 && (
          <div
            className="rust-plate flex items-center justify-center font-headline text-[10px] tracking-[0.2em] text-red-50"
            style={{ flex: hostCount }}
          >
            H · {hostCount}
          </div>
        )}
        {neutralCount > 0 && (
          <div
            className="chrome-plate flex items-center justify-center font-headline text-[10px] tracking-[0.2em] text-on-surface-variant"
            style={{ flex: neutralCount }}
          >
            N · {neutralCount}
          </div>
        )}
        {guestCount > 0 && (
          <div
            className="brass-plate flex items-center justify-center font-headline text-[10px] tracking-[0.2em] text-amber-50"
            style={{ flex: guestCount }}
          >
            G · {guestCount}
          </div>
        )}
      </div>

      {/* Node row with dashed connectors */}
      <div className="relative z-10 w-full max-w-3xl flex items-center justify-between gap-0 px-2">
        {nodes.map((node, i) => {
          const targetable = canTarget(node);
          const isHost = node.owner === "HOST";
          const isGuest = node.owner === "GUEST";
          const plate = isHost ? "rust-plate" : isGuest ? "brass-plate" : "chrome-plate";
          const accent = isHost
            ? "text-red-200"
            : isGuest
              ? "text-amber-200"
              : "text-on-surface-variant";

          return (
            <div key={node.nodeId} className="relative flex items-center">
              <button
                data-testid={`campaign-node-${node.nodeId}`}
                data-owner={node.owner}
                data-targetable={String(targetable)}
                onClick={() => {
                  if (targetable) sendGameIntent("TARGET_NODE", { nodeId: node.nodeId });
                }}
                disabled={!targetable}
                className={`
                  relative w-14 h-14 sm:w-16 sm:h-16 ${plate} chamfer-panel corner-brackets ${accent}
                  flex flex-col items-center justify-center transition-all
                  ${targetable ? "ring-2 ring-secondary-container animate-pulse cursor-pointer hover:brightness-125" : "opacity-80 cursor-not-allowed"}
                `}
              >
                <span className="cb-bl" />
                <span className="cb-br" />
                <span className="font-headline font-black text-lg tracking-widest">
                  N{node.nodeId + 1}
                </span>
                <span className="font-label text-[9px] tracking-[0.2em] uppercase">
                  {node.owner.slice(0, 4)}
                </span>
              </button>
              {i < nodes.length - 1 && (
                <div
                  aria-hidden
                  className="w-4 sm:w-8 h-[1px] border-t border-dashed border-outline-variant"
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Status + action footer */}
      <div className="relative z-10 flex flex-col items-center gap-3 mt-2">
        <p
          data-testid="campaign-status"
          className={`font-headline uppercase tracking-[0.25em] text-[12px] ${
            isActive ? "text-secondary" : "text-on-surface-variant/70"
          }`}
        >
          {isActive ? "Your Turn · Select adjacent enemy node" : "Awaiting enemy orders…"}
        </p>

        <button
          onClick={() => sendGameIntent("INTENT_FORFEIT", {})}
          className="btn-archon-caution"
          data-testid="btn-forfeit-campaign"
        >
          ▲ Forfeit Campaign
        </button>
      </div>
    </div>
  );
}
