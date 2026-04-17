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

  return (
    <div className="flex flex-col items-center gap-6">
      <h2 className="text-2xl font-bold text-amber-400">Loadout Phase</h2>
      <p className="text-gray-400 text-sm">
        Spend Void-Scrap to equip Tactical Items before battle
      </p>

      {/* Status */}
      <div className="flex gap-4 text-sm">
        <span className="text-amber-300">Void-Scrap: {myScrap}</span>
        <span className={totalCost > myScrap ? "text-red-400" : "text-green-400"}>
          Cost: {totalCost}
        </span>
        <span className={selected.length > maxSlots ? "text-red-400" : "text-gray-400"}>
          Slots: {selected.length}/{maxSlots}
        </span>
      </div>

      {/* Item Catalog */}
      <div className="grid grid-cols-2 gap-3 max-w-lg">
        {ITEM_CATALOG.map((item) => {
          const isSelected = selected.includes(item.itemId);
          const canSelect = withinSlots || isSelected;
          return (
            <button
              key={item.itemId}
              onClick={() => canSelect && toggleItem(item.itemId)}
              disabled={isReady || (!canSelect && !isSelected)}
              className={`
                p-3 rounded-lg border-2 text-left transition
                ${isSelected ? "border-amber-500 bg-amber-900/20" : "border-gray-700 bg-gray-800/50"}
                ${isReady ? "opacity-50 cursor-not-allowed" : "hover:border-gray-500"}
              `}
            >
              <div className="font-bold text-sm">{item.name}</div>
              <div className="text-xs text-gray-400 mt-1">{item.description}</div>
              <div className="text-xs text-amber-400 mt-1">
                Cost: {item.cost} | Trigger: {item.trigger}
              </div>
            </button>
          );
        })}
      </div>

      {/* Ready button */}
      <button
        onClick={handleReady}
        disabled={isReady || !canAfford || !withinSlots}
        className={`
          px-6 py-3 rounded font-bold transition
          ${isReady ? "bg-gray-700 text-gray-400 cursor-not-allowed" : "bg-amber-600 hover:bg-amber-500"}
        `}
      >
        {isReady ? "✓ Ready — Waiting for opponent" : "Ready Up"}
      </button>

      {opponentReady && !isReady && (
        <p className="text-yellow-400 text-sm">Opponent is ready!</p>
      )}

      {/* Sabotage use during LOADOUT */}
      {isReady && myPlayer?.loadout?.some((i) => i.itemId === "SABOTAGE" && !i.consumed) && (
        <div className="flex flex-col items-center gap-2">
          <p className="text-xs text-gray-400">
            Use Sabotage now to disable an enemy node modifier for this match.
          </p>
          <div className="flex gap-2 flex-wrap justify-center">
            {gameState?.campaign.nodes
              .map((n, idx) => ({ ...n, idx }))
              .filter((n) => n.owner !== null && n.owner !== myRole && n.owner !== "NEUTRAL")
              .map((n) => {
                const planet = getPlanet(n.idx);
                const label = planet ? `${planet.icon} ${planet.name}` : `Node ${n.idx + 1}`;
                return (
                  <button
                    key={n.idx}
                    onClick={() => sendGameIntent("INTENT_USE_ITEM", { itemId: "SABOTAGE", targetId: n.idx })}
                    className="px-3 py-1 bg-red-800 hover:bg-red-700 text-red-200 rounded text-xs transition"
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
