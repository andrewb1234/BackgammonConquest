import { useState } from "react";
import { useGameStore } from "../store/useGameStore";
import {
  ITEM_CATALOG,
  MAX_LOADOUT_SLOTS,
  MAW_EXTRA_SLOT,
  getPlanet,
  type ItemId,
} from "@backgammon-conquest/shared";
import type { PlayerRole } from "@backgammon-conquest/shared";

export default function LoadoutView() {
  const gameState = useGameStore((s) => s.gameState);
  const clientId = useGameStore((s) => s.clientId);
  const sendGameIntent = useGameStore((s) => s.sendGameIntent);

  const myPlayer = gameState?.players.find((p) => p.playerId === clientId);
  const myRole = myPlayer?.role as PlayerRole | undefined;
  const myScrap = myPlayer?.voidScrap ?? 0;
  const isReady = gameState?.battle?.loadoutReady[myRole!] ?? false;
  const opponentReady = gameState?.battle?.loadoutReady[myRole === "HOST" ? "GUEST" : "HOST"] ?? false;

  // The Maw (Node 5 in UI, index 4 in code) grants extra slots
  const mawNode = gameState?.campaign?.nodes[4];
  const maxSlots = mawNode?.owner === myRole ? MAW_EXTRA_SLOT : MAX_LOADOUT_SLOTS;

  const [selected, setSelected] = useState<ItemId[]>([]);

  const totalCost = selected.reduce((sum, id) => {
    const def = ITEM_CATALOG.find((i) => i.itemId === id);
    return sum + (def?.cost ?? 0);
  }, 0);

  const canAfford = totalCost <= myScrap;
  const withinSlots = selected.length <= maxSlots;

  const toggleItem = (itemId: ItemId) => {
    if (isReady) return;
    setSelected((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  const handleReady = () => {
    if (!canAfford || !withinSlots || isReady) return;
    sendGameIntent("READY_LOADOUT", { selectedItems: selected });
  };

  const overBudget = totalCost > myScrap;
  const overSlots = selected.length > maxSlots;

  return (
    <div
      data-testid="view-loadout"
      className="relative w-full flex flex-col items-center gap-6 py-4"
    >
      <div className="absolute inset-0 hologram-grid opacity-20 pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 text-center">
        <p className="telemetry-warm mb-1">// TACTICAL LOADOUT //</p>
        <h2 className="font-headline font-black text-2xl sm:text-3xl tracking-[0.2em] uppercase text-secondary-container">
          Operator Loadout
        </h2>
        <p className="font-body text-sm text-on-surface-variant mt-2 max-w-lg mx-auto">
          Commit Void-Scrap to tactical items before engagement.
        </p>
      </div>

      {/* Resource ribbon */}
      <div
        data-testid="loadout-resources"
        className="relative z-10 w-full max-w-2xl grid grid-cols-3 gap-2 font-headline uppercase tracking-[0.2em] text-[11px]"
      >
        <ResourceTile label="Void-Scrap" value={String(myScrap)} tone="tertiary" />
        <ResourceTile
          label="Committed"
          value={String(totalCost)}
          tone={overBudget ? "error" : "primary"}
        />
        <ResourceTile
          label="Slots"
          value={`${selected.length}/${maxSlots}`}
          tone={overSlots ? "error" : "secondary"}
        />
      </div>

      {/* Item catalog */}
      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
        {ITEM_CATALOG.map((item) => {
          const isSelected = selected.includes(item.itemId);
          const canSelect = withinSlots || isSelected;
          return (
            <button
              key={item.itemId}
              data-testid={`loadout-item-${item.itemId.toLowerCase()}`}
              data-selected={String(isSelected)}
              onClick={() => canSelect && toggleItem(item.itemId)}
              disabled={isReady || (!canSelect && !isSelected)}
              className={`
                relative corner-brackets text-on-surface
                bg-surface-container border border-outline-variant
                p-4 text-left transition-colors
                ${
                  isSelected
                    ? "ring-2 ring-secondary-container text-secondary"
                    : "hover:border-secondary-container"
                }
                ${isReady ? "opacity-50 cursor-not-allowed" : ""}
              `}
            >
              <span className="cb-bl" />
              <span className="cb-br" />

              <div className="flex items-start justify-between">
                <h3 className="font-headline font-black text-sm uppercase tracking-[0.15em] text-on-surface">
                  {item.name}
                </h3>
                <span className="font-headline text-[10px] tracking-[0.2em] uppercase text-tertiary">
                  {item.cost} SCRAP
                </span>
              </div>
              <p className="font-body text-xs text-on-surface-variant mt-2">
                {item.description}
              </p>
              <div className="mt-3 flex items-center justify-between font-label text-[10px] tracking-[0.2em] uppercase">
                <span className="text-on-surface-variant/70">TRIGGER</span>
                <span className="text-secondary">{item.trigger}</span>
              </div>
              <div className="mt-2 h-4 flex items-center">
                {isSelected ? (
                  <span className="flex items-center gap-2 font-headline text-[10px] tracking-[0.25em] uppercase text-tertiary">
                    <span className="w-2 h-2 bg-tertiary animate-pulse" />
                    Equipped
                  </span>
                ) : (
                  <span className="font-headline text-[10px] tracking-[0.25em] uppercase text-on-surface-variant/60">
                    Tap To Equip
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Ready */}
      <div className="relative z-10 flex flex-col items-center gap-3">
        <button
          onClick={handleReady}
          disabled={isReady || !canAfford || !withinSlots}
          data-testid="btn-ready-loadout"
          className={isReady ? "btn-archon-ghost" : "btn-archon-primary"}
        >
          {isReady ? "✓ Ready · Awaiting Opponent" : "Ready Up"}
        </button>
        {opponentReady && !isReady && (
          <p className="font-headline uppercase tracking-[0.25em] text-[11px] text-tertiary animate-pulse">
            Opponent is ready — lock in your loadout
          </p>
        )}
      </div>

      {/* Sabotage strip — only surfaces mid-loadout after READY, for SABOTAGE owners */}
      {isReady && myPlayer?.loadout?.some((i) => i.itemId === "SABOTAGE" && !i.consumed) && (
        <div className="relative z-10 w-full max-w-2xl corner-brackets text-error bg-surface-container border border-error/40 p-4">
          <span className="cb-bl" />
          <span className="cb-br" />
          <p className="font-headline uppercase tracking-[0.2em] text-xs text-error mb-2">
            Sabotage Protocol Online
          </p>
          <p className="font-body text-xs text-on-surface-variant mb-3">
            Disable an enemy node modifier for the upcoming engagement.
          </p>
          <div className="flex flex-wrap gap-2">
            {gameState?.campaign.nodes
              .map((n, idx) => ({ ...n, idx }))
              .filter((n) => n.owner !== null && n.owner !== myRole && n.owner !== "NEUTRAL")
              .map((n) => {
                const planet = getPlanet(n.idx);
                const label = planet ? `${planet.icon} ${planet.name}` : `Node ${n.idx + 1}`;
                return (
                  <button
                    key={n.idx}
                    onClick={() =>
                      sendGameIntent("INTENT_USE_ITEM", {
                        itemId: "SABOTAGE",
                        targetId: n.idx,
                      })
                    }
                    className="btn-archon-caution text-[11px] py-2"
                  >
                    Sabotage {label}
                  </button>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}

function ResourceTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "tertiary" | "secondary" | "primary" | "error";
}) {
  const valueColor =
    tone === "tertiary"
      ? "text-tertiary"
      : tone === "secondary"
        ? "text-secondary"
        : tone === "primary"
          ? "text-primary"
          : "text-error";
  return (
    <div className="chamfer-panel bg-surface-container border border-outline-variant px-3 py-2 flex flex-col items-center">
      <span className="text-[10px] text-on-surface-variant">{label}</span>
      <span className={`font-headline font-black text-lg ${valueColor}`}>{value}</span>
    </div>
  );
}
