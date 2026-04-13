import { useState, useCallback } from "react";
import { useGameStore } from "../store/useGameStore";
import type { BattleState, PlayerRole, Point } from "@backgammon-conquest/shared";
import type { ValidMove } from "@backgammon-conquest/shared";

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

  const myRole = gameState?.players.find((p) => p.playerId === clientId)?.role as PlayerRole | undefined;

  const handleRoll = useCallback(() => {
    sendGameIntent("INTENT_ROLL", {});
  }, [sendGameIntent]);

  const handlePointClick = useCallback((pointIndex: number | "BAR") => {
    if (!isMyTurn || !dice) return;
    setSelectedPoint(pointIndex);
    setPendingMoves([]);
  }, [isMyTurn, dice]);

  const handleTargetClick = useCallback((targetIndex: number) => {
    if (!isMyTurn || !dice || selectedPoint === null) return;

    // Find a valid move for the selected die
    const availableDice = dice
      .map((d, i) => ({ die: d, index: i, used: diceUsed[i] }))
      .filter((d) => !d.used);

    for (const { die } of availableDice) {
      const move: ValidMove = {
        fromPoint: selectedPoint,
        toPoint: targetIndex,
        dieUsed: die,
        isBearingOff: targetIndex === -1 || targetIndex === 24,
      };

      // Add to pending moves and mark die as conceptually used
      setPendingMoves((prev) => [...prev, move]);
      setSelectedPoint(null);
      return;
    }
  }, [isMyTurn, dice, diceUsed, selectedPoint]);

  const handleSubmitMoves = useCallback(() => {
    if (pendingMoves.length === 0) return;

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
  if (selectedPoint !== null && dice) {
    const availableDice = dice
      .map((d, i) => ({ die: d, index: i, used: diceUsed[i] }))
      .filter((d) => !d.used);

    for (const { die: _d } of availableDice) {
      const dir = myRole === "HOST" ? -1 : 1;
      if (selectedPoint === "BAR") {
        const entry = myRole === "HOST" ? (24 - _d) : (_d - 1);
        if (entry >= 0 && entry < 24) validTargets.add(entry);
      } else {
        const dest = selectedPoint + dir * _d;
        if (dest >= 0 && dest < 24) validTargets.add(dest);
        // Bearing off targets
        if (myRole === "HOST" && dest < 0) validTargets.add(-1);
        if (myRole === "GUEST" && dest > 23) validTargets.add(24);
      }
    }
  }

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between w-full px-4">
        <h2 className="text-xl font-bold text-amber-400">Planetary Battle</h2>
        <span className="text-sm text-gray-400">
          Turn {battle.turnCount} — {isMyTurn ? "Your turn" : "Opponent's turn"}
        </span>
      </div>

      {/* Dice */}
      <div className="flex gap-3 items-center">
        {dice ? (
          dice.map((d, i) => (
            <div
              key={i}
              className={`w-10 h-10 rounded border-2 flex items-center justify-center font-bold text-lg
                ${diceUsed[i] ? "border-gray-700 text-gray-600 bg-gray-900" : "border-amber-500 text-amber-400 bg-gray-800"}
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

      {/* Forfeit */}
      <button
        onClick={() => sendGameIntent("INTENT_FORFEIT", {})}
        className="mt-2 px-4 py-1 bg-red-900/40 hover:bg-red-900/60 text-red-400 rounded text-sm transition"
      >
        Forfeit Battle
      </button>
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
      `}
      onClick={isValidTarget ? onTargetClick : canSelect ? onClick : undefined}
    >
      <div className={`${triangle} w-0 h-0`} />
      <div className={`flex flex-col items-center ${bgColor} rounded-sm min-h-[24px] w-full`}>
        {hasPieces && (
          <span className={`text-[10px] font-bold ${ownerColor}`}>
            {point.count}
          </span>
        )}
        <span className="text-[8px] text-gray-600">{index}</span>
      </div>
    </div>
  );
}
