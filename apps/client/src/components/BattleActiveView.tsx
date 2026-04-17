import { useState, useCallback, useEffect } from "react";
import { useGameStore } from "../store/useGameStore";
import type { BattleState, PlayerRole } from "@backgammon-conquest/shared";
import type { ValidMove, TacticalItem } from "@backgammon-conquest/shared";
import { ITEM_CATALOG, getValidMoves, getPlanet } from "@backgammon-conquest/shared";
import { playDiceRoll, playMove, playItemUse, playEscalation } from "../services/sounds";
import TacticalBoard from "./TacticalBoard";

export default function BattleActiveView() {
  const gameState = useGameStore((s) => s.gameState);
  const clientId = useGameStore((s) => s.clientId);
  const sendGameIntent = useGameStore((s) => s.sendGameIntent);
  const lastRejection = useGameStore((s) => s.lastRejection);

  const battle = gameState?.battle as BattleState | undefined;
  const isMyTurn = battle?.activePlayerId === clientId;
  const dice = battle?.dice ?? null;
  const diceUsed = battle?.diceUsed ?? [];
  const board = battle?.board;

  const [selectedPoint, setSelectedPoint] = useState<number | "BAR" | null>(null);
  const [pendingMoves, setPendingMoves] = useState<ValidMove[]>([]);
  const [targetingItem, setTargetingItem] = useState<string | null>(null);
  const [diceRolling, setDiceRolling] = useState(false);

  const myRole = gameState?.players.find((p) => p.playerId === clientId)?.role as PlayerRole | undefined;
  const myPlayer = gameState?.players.find((p) => p.playerId === clientId);

  const handleRoll = useCallback(() => {
    setDiceRolling(true);
    playDiceRoll();
    sendGameIntent("INTENT_ROLL", {});
  }, [sendGameIntent]);

  // Clear rolling animation once dice appear
  useEffect(() => {
    if (dice && diceRolling) {
      const t = setTimeout(() => setDiceRolling(false), 400);
      return () => clearTimeout(t);
    }
  }, [dice, diceRolling]);

  const handlePointClick = useCallback((pointIndex: number | "BAR") => {
    // If in item targeting mode, use the clicked point as target
    if (targetingItem && typeof pointIndex === "number") {
      sendGameIntent("INTENT_USE_ITEM", { itemId: targetingItem, targetId: pointIndex });
      setTargetingItem(null);
      return;
    }
    if (!isMyTurn || !dice) return;
    setSelectedPoint(pointIndex);
    setPendingMoves([]);
  }, [isMyTurn, dice, targetingItem, sendGameIntent]);

  const handleTargetClick = useCallback((targetIndex: number) => {
    if (!isMyTurn || !dice || selectedPoint === null || !myRole) return;

    // Use shared rules engine to find a valid move
    const moves = getValidMoves(board!, myRole, dice, diceUsed);
    const matching = moves.find((m) => m.fromPoint === selectedPoint && m.toPoint === targetIndex);

    if (matching) {
      setPendingMoves((prev) => [...prev, matching]);
      setSelectedPoint(null);
    }
  }, [isMyTurn, dice, diceUsed, selectedPoint, myRole, board]);

  const handleSubmitMoves = useCallback(() => {
    if (pendingMoves.length === 0) return;

    playMove();
    sendGameIntent("INTENT_MOVE", {
      moves: pendingMoves.map((m) => ({
        fromPoint: m.fromPoint,
        toPoint: m.toPoint,
        dieUsed: m.dieUsed,
      })),
    });
    setPendingMoves([]);
  }, [pendingMoves, sendGameIntent]);

  const handleClearMoves = useCallback(() => {
    setPendingMoves([]);
    setSelectedPoint(null);
  }, []);

  if (!board || !battle) {
    return <div className="text-gray-500">Waiting for battle data...</div>;
  }

  // Determine which points are valid targets for the selected piece
  const validTargets = new Set<number>();
  if (selectedPoint !== null && dice && myRole) {
    const moves = getValidMoves(board, myRole, dice, diceUsed);
    const filtered = moves.filter((m) => m.fromPoint === selectedPoint);
    for (const m of filtered) {
      validTargets.add(m.toPoint);
    }
  }

  // Resolve contested planet + sabotage state for header
  const contestedPlanet = getPlanet(battle.contestedNodeId);
  const planetName = contestedPlanet?.name ?? `Node ${battle.contestedNodeId + 1}`;
  const planetIcon = contestedPlanet?.icon ?? "⬢";
  const planetEffect = contestedPlanet?.effect ?? "";
  const isSabotaged = battle.disabledModifierNodeId === battle.contestedNodeId;

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-4xl">
      {/* Header */}
      <div className="flex flex-col items-center gap-1 w-full px-4">
        <div className="flex items-center justify-between w-full">
          <h2 className="text-xl font-bold text-amber-400 flex items-center gap-2">
            <span className="text-2xl">{planetIcon}</span>
            {planetName}
          </h2>
          <div className="flex items-center gap-3">
            {battle.escalation.multiplier > 1 && (
              <span className="text-sm font-bold text-red-400">
                {battle.escalation.multiplier}× Stakes
              </span>
            )}
            <span className="text-sm text-gray-400">
              Turn {battle.turnCount} — {isMyTurn ? "Your turn" : "Opponent's turn"}
            </span>
            <span className="text-xs text-amber-300">
              Scrap: {myPlayer?.voidScrap ?? 0}
            </span>
          </div>
        </div>
        {planetEffect && (
          <div
            className={`px-3 py-1 rounded-full text-xs border ${
              isSabotaged
                ? "border-red-800 bg-red-950/40 text-red-400 line-through opacity-70"
                : "border-amber-800/60 bg-amber-950/30 text-amber-300"
            }`}
            title={isSabotaged ? "Modifier sabotaged for this match" : "Active planetary modifier"}
          >
            {isSabotaged && <span className="mr-1 no-underline">⚠ SABOTAGED:</span>}
            {planetEffect}
          </div>
        )}
      </div>

      {/* Dice */}
      <div className="flex gap-3 items-center">
        {dice ? (
          dice.map((d, i) => (
            <div
              key={i}
              className={`w-10 h-10 rounded border-2 flex items-center justify-center font-bold text-lg transition-all duration-300
                ${diceUsed[i] ? "border-gray-700 text-gray-600 bg-gray-900" : "border-amber-500 text-amber-400 bg-gray-800"}
                ${diceRolling ? "animate-bounce scale-110" : ""}
              `}
            >
              {d}
            </div>
          ))
        ) : (
          isMyTurn && (
            <button
              onClick={handleRoll}
              className="px-6 py-2 bg-amber-600 hover:bg-amber-500 rounded font-bold transition"
            >
              Roll Dice
            </button>
          )
        )}
      </div>

      {/* Holographic Tactical Board */}
      <TacticalBoard
        board={board}
        myRole={myRole}
        isMyTurn={isMyTurn}
        dice={dice}
        selectedPoint={selectedPoint}
        validTargets={validTargets}
        targetingItem={targetingItem}
        onPointClick={handlePointClick}
        onTargetClick={handleTargetClick}
      />

      {/* Pending moves + submit */}
      {pendingMoves.length > 0 && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">
            {pendingMoves.length} move(s) pending
          </span>
          <button
            onClick={handleSubmitMoves}
            className="px-4 py-1 bg-green-700 hover:bg-green-600 rounded font-bold text-sm transition"
          >
            Submit
          </button>
          <button
            onClick={handleClearMoves}
            className="px-4 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm transition"
          >
            Clear
          </button>
        </div>
      )}

      {/* Rejection feedback */}
      {lastRejection && (
        <p className="text-red-400 text-sm">Rejected: {lastRejection.reason}</p>
      )}

      {/* Escalation & Items */}
      <div className="flex flex-wrap gap-2 mt-2 items-center">
        {/* Escalation: only controller can invoke, only before rolling */}
        {isMyTurn && !dice && battle?.escalation.status === "IDLE" &&
          battle.escalation.controllerPlayerId === clientId && (
          <button
            onClick={() => { playEscalation(); sendGameIntent("INTENT_INVOKE_ESCALATION", {}); }}
            className="px-3 py-1 bg-red-800 hover:bg-red-700 text-red-200 rounded text-xs font-bold transition"
          >
            Escalate ({battle.escalation.multiplier * 2}×)
          </button>
        )}

        {/* Tactical Items */}
        {targetingItem && (
          <span className="text-amber-300 text-xs animate-pulse">
            Click a point on the board to target →
            <button
              onClick={() => setTargetingItem(null)}
              className="ml-2 text-gray-400 underline"
            >
              Cancel
            </button>
          </span>
        )}
        {myPlayer?.loadout?.filter((i: TacticalItem) => !i.consumed).map((item: TacticalItem) => {
          const def = ITEM_CATALOG.find((d) => d.itemId === item.itemId);
          if (!def) return null;
          const canUse =
            isMyTurn &&
            ((def.trigger === "PRE_MOVE" && !dice) ||
            (def.trigger === "POST_ROLL" && !!dice));
          const needsTarget = item.itemId !== "LUCKY_CHANCE";
          const isActive = targetingItem === item.itemId;
          return (
            <button
              key={item.itemId}
              onClick={() => {
                if (!canUse) return;
                if (item.itemId === "LUCKY_CHANCE") {
                  playItemUse();
                  sendGameIntent("INTENT_USE_ITEM", { itemId: item.itemId });
                } else if (needsTarget) {
                  setTargetingItem(isActive ? null : item.itemId);
                }
              }}
              disabled={!canUse}
              className={`px-3 py-1 rounded text-xs transition ${
                isActive
                  ? "bg-amber-600 text-white ring-2 ring-amber-400"
                  : canUse
                    ? "bg-amber-800 hover:bg-amber-700 text-amber-200"
                    : "bg-gray-800 text-gray-500 cursor-not-allowed"
              }`}
            >
              {def.name}
            </button>
          );
        })}

        <button
          onClick={() => sendGameIntent("INTENT_FORFEIT", {})}
          className="px-3 py-1 bg-red-900/40 hover:bg-red-900/60 text-red-400 rounded text-xs transition"
        >
          Forfeit
        </button>
      </div>
    </div>
  );
}
