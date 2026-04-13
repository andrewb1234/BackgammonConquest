import { useState, useCallback, useEffect } from "react";
import { useGameStore } from "../store/useGameStore";
import type { BattleState, PlayerRole, Point } from "@backgammon-conquest/shared";
import type { ValidMove, TacticalItem } from "@backgammon-conquest/shared";
import { ITEM_CATALOG, getValidMoves } from "@backgammon-conquest/shared";
import { playDiceRoll, playMove, playItemUse, playEscalation } from "../services/sounds";

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

  const points = board.points;
  const bars = board.bars;
  const borneOff = board.borneOff;

  // Determine which points are valid targets for the selected piece
  const validTargets = new Set<number>();
  if (selectedPoint !== null && dice && myRole) {
    const moves = getValidMoves(board, myRole, dice, diceUsed);
    const filtered = moves.filter((m) => m.fromPoint === selectedPoint);
    for (const m of filtered) {
      validTargets.add(m.toPoint);
    }
  }

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between w-full px-4">
        <h2 className="text-xl font-bold text-amber-400">Planetary Battle</h2>
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

      {/* Opponent borne off */}
      <div className="text-xs text-gray-500">
        Opponent Orbital Evacuation: {borneOff[myRole === "HOST" ? "GUEST" : "HOST"]}/15
      </div>

      {/* Board */}
      <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 w-full">
        {/* Top row: points 12-23 (GUEST home side) */}
        <div className="flex justify-between mb-1">
          {Array.from({ length: 12 }, (_, i) => i + 12).map((idx) => (
            <PointComponent
              key={idx}
              point={points[idx]}
              index={idx}
              isTop
              isSelected={selectedPoint === idx}
              isValidTarget={validTargets.has(idx)}
              isMyPiece={points[idx].owner === myRole}
              canSelect={isMyTurn && !!dice && points[idx].owner === myRole}
              isItemTarget={!!targetingItem && points[idx].count > 0 && (
                (targetingItem === "AIR_STRIKE" && points[idx].owner !== myRole && points[idx].owner !== null && points[idx].count === 1) ||
                (targetingItem === "ANGELIC_PROTECTION" && points[idx].owner === myRole)
              )}
              onClick={() => handlePointClick(idx)}
              onTargetClick={() => handleTargetClick(idx)}
            />
          ))}
        </div>

        {/* Bar */}
        <div className="flex justify-center gap-8 py-2 border-y border-gray-700 my-1">
          <div
            className={`px-3 py-1 rounded text-sm cursor-pointer transition
              ${bars.HOST > 0 && myRole === "HOST" && isMyTurn && !!dice ? "bg-red-900/40 text-red-400 hover:bg-red-900/60" : "bg-gray-900 text-gray-500"}
              ${selectedPoint === "BAR" && myRole === "HOST" ? "ring-2 ring-amber-400" : ""}
            `}
            onClick={() => myRole === "HOST" && bars.HOST > 0 && handlePointClick("BAR")}
          >
            Void-Buffer (HOST): {bars.HOST}
          </div>
          <div
            className={`px-3 py-1 rounded text-sm cursor-pointer transition
              ${bars.GUEST > 0 && myRole === "GUEST" && isMyTurn && !!dice ? "bg-yellow-900/40 text-yellow-400 hover:bg-yellow-900/60" : "bg-gray-900 text-gray-500"}
              ${selectedPoint === "BAR" && myRole === "GUEST" ? "ring-2 ring-amber-400" : ""}
            `}
            onClick={() => myRole === "GUEST" && bars.GUEST > 0 && handlePointClick("BAR")}
          >
            Void-Buffer (GUEST): {bars.GUEST}
          </div>
        </div>

        {/* Bottom row: points 0-11 (HOST home side) */}
        <div className="flex justify-between mt-1">
          {Array.from({ length: 12 }, (_, i) => 11 - i).map((idx) => (
            <PointComponent
              key={idx}
              point={points[idx]}
              index={idx}
              isTop={false}
              isSelected={selectedPoint === idx}
              isValidTarget={validTargets.has(idx)}
              isMyPiece={points[idx].owner === myRole}
              canSelect={isMyTurn && !!dice && points[idx].owner === myRole}
              isItemTarget={!!targetingItem && points[idx].count > 0 && (
                (targetingItem === "AIR_STRIKE" && points[idx].owner !== myRole && points[idx].owner !== null && points[idx].count === 1) ||
                (targetingItem === "ANGELIC_PROTECTION" && points[idx].owner === myRole)
              )}
              onClick={() => handlePointClick(idx)}
              onTargetClick={() => handleTargetClick(idx)}
            />
          ))}
        </div>
      </div>

      {/* My borne off */}
      <div className="text-xs text-gray-400">
        Your Orbital Evacuation: {borneOff[myRole ?? "HOST"]}/15
      </div>

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

// ---------------------------------------------------------
// POINT COMPONENT
// ---------------------------------------------------------

function PointComponent({
  point,
  index,
  isTop,
  isSelected,
  isValidTarget,
  isMyPiece,
  canSelect,
  isItemTarget,
  onClick,
  onTargetClick,
}: {
  point: Point;
  index: number;
  isTop: boolean;
  isSelected: boolean;
  isValidTarget: boolean;
  isMyPiece: boolean;
  canSelect: boolean;
  isItemTarget?: boolean;
  onClick: () => void;
  onTargetClick: () => void;
}) {
  const hasPieces = point.count > 0;
  const ownerColor = point.owner === "HOST" ? "text-red-400" : "text-yellow-400";
  const bgColor = isMyPiece
    ? (point.owner === "HOST" ? "bg-red-900/30" : "bg-yellow-900/30")
    : (point.owner === "HOST" ? "bg-red-900/20" : point.owner === "GUEST" ? "bg-yellow-900/20" : "bg-gray-800");

  const triangle = isTop ? "border-b-[12px] border-l-[8px] border-r-[8px] border-b-gray-700 border-l-transparent border-r-transparent" : "border-t-[12px] border-l-[8px] border-r-[8px] border-t-gray-700 border-l-transparent border-r-transparent";

  return (
    <div
      className={`flex flex-col items-center w-[30px] cursor-pointer transition
        ${isSelected ? "ring-2 ring-amber-400 rounded" : ""}
        ${isValidTarget ? "ring-2 ring-green-500 rounded" : ""}
        ${isItemTarget ? "ring-2 ring-amber-500 rounded bg-amber-900/30" : ""}
      `}
      onClick={isItemTarget ? onClick : isValidTarget ? onTargetClick : canSelect ? onClick : undefined}
    >
      <div className={`${triangle} w-0 h-0`} />
      <div className={`flex flex-col items-center ${bgColor} rounded-sm min-h-[24px] w-full`}>
        {hasPieces && (
          <span className={`text-[10px] font-bold ${ownerColor} transition-all duration-200`}>
            {point.count}
          </span>
        )}
        <span className="text-[8px] text-gray-600">{index}</span>
        {point.activeEffects?.length > 0 && (
          <span className="text-[7px] text-cyan-400 animate-pulse">🛡</span>
        )}
      </div>
    </div>
  );
}
