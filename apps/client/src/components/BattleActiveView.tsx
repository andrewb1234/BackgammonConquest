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
    <div
      className="flex flex-col items-center gap-4 w-full max-w-4xl"
      data-testid="battle-active"
      data-my-role={myRole ?? ""}
      data-active-role={
        gameState?.players.find((p) => p.playerId === battle.activePlayerId)?.role ?? ""
      }
      data-phase={gameState?.phase ?? ""}
      data-state-version={gameState?.stateVersion ?? 0}
      data-turn-count={battle.turnCount}
      data-dice={dice ? dice.join(",") : ""}
      data-dice-used={dice ? diceUsed.map((u) => (u ? "1" : "0")).join(",") : ""}
      data-escalation-status={battle.escalation.status}
      data-escalation-multiplier={battle.escalation.multiplier}
    >
      {/* Header */}
      <div className="flex flex-col items-center gap-1 w-full px-4">
        <div className="flex items-center justify-between w-full gap-3 flex-wrap">
          <h2 className="text-xl font-mono font-bold tracking-wider uppercase text-amber-300 crt-glow flex items-center gap-2">
            <span className="text-2xl">{planetIcon}</span>
            {planetName}
          </h2>
          <div className="chrome-plate chamfer-panel noise-overlay flex items-center gap-3 px-3 py-1">
            {battle.escalation.multiplier > 1 && (
              <span className="flex items-center gap-1 text-[11px] font-mono font-bold uppercase tracking-widest text-red-300 crt-glow">
                <span className="led-dot bg-red-400 text-red-400 animate-pulse" />
                {battle.escalation.multiplier}× STAKES
              </span>
            )}
            <span className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest text-stone-200">
              <span
                className={`led-dot ${isMyTurn ? "bg-emerald-400 text-emerald-400" : "bg-stone-500 text-stone-500"}`}
              />
              TURN {String(battle.turnCount).padStart(2, "0")} · {isMyTurn ? "YOUR MOVE" : "OPPONENT"}
            </span>
            <span className="text-[11px] font-mono uppercase tracking-widest text-amber-300 crt-glow">
              SCRAP {String(myPlayer?.voidScrap ?? 0).padStart(3, "0")}
            </span>
          </div>
        </div>
        {planetEffect && (
          <div
            className={`chamfer-panel noise-overlay px-3 py-1 text-xs font-mono tracking-wide uppercase ${
              isSabotaged
                ? "rust-plate text-red-200 line-through opacity-80"
                : "brass-plate text-amber-100 crt-glow"
            }`}
            title={isSabotaged ? "Modifier sabotaged for this match" : "Active planetary modifier"}
          >
            {isSabotaged && <span className="mr-1 no-underline text-red-300">▲ SABOTAGED ·</span>}
            {planetEffect}
          </div>
        )}
      </div>

      {/* Dice — chrome-plated industrial tiles */}
      <div className="flex gap-2 sm:gap-3 items-center">
        {dice ? (
          dice.map((d, i) => (
            <div
              key={i}
              className={`
                w-10 h-10 chamfer-panel noise-overlay
                flex items-center justify-center font-mono font-bold text-lg
                transition-all duration-300
                ${diceUsed[i]
                  ? "chrome-plate text-gray-500 opacity-60"
                  : "chrome-plate text-amber-300 crt-glow"}
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
              data-testid="btn-roll-dice"
              className="chamfer-panel brass-plate noise-overlay px-6 py-2 font-mono font-bold tracking-widest uppercase text-amber-50 crt-glow hover:brightness-125 transition"
            >
              ▶ Roll Dice
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

      {/* Pending moves + submit — chrome command strip */}
      {pendingMoves.length > 0 && (
        <div className="chrome-plate chamfer-panel noise-overlay flex items-center gap-3 px-3 py-1">
          <span className="led-dot bg-amber-300 text-amber-300" />
          <span className="text-[11px] font-mono tracking-widest uppercase text-amber-200 crt-glow">
            {pendingMoves.length} MOVE{pendingMoves.length === 1 ? "" : "S"} PENDING
          </span>
          <button
            onClick={handleSubmitMoves}
            data-testid="btn-submit-moves"
            data-pending-count={pendingMoves.length}
            className="chamfer-panel px-3 py-[2px] bg-emerald-700 hover:bg-emerald-600 font-mono font-bold tracking-widest text-[11px] uppercase text-emerald-50 crt-glow-green transition"
          >
            ▶ Submit
          </button>
          <button
            onClick={handleClearMoves}
            data-testid="btn-clear-moves"
            className="chamfer-panel px-3 py-[2px] bg-stone-700 hover:bg-stone-600 font-mono tracking-widest text-[11px] uppercase text-stone-100 transition"
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
            className="chamfer-panel rust-plate noise-overlay px-3 py-1 text-[11px] font-mono font-bold tracking-widest uppercase text-red-100 crt-glow hover:brightness-125 transition"
          >
            ▲▲ Escalate · {battle.escalation.multiplier * 2}×
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
              className={`chamfer-panel noise-overlay px-3 py-1 text-[11px] font-mono font-bold tracking-widest uppercase transition ${
                isActive
                  ? "brass-plate text-amber-50 ring-2 ring-amber-300 crt-glow"
                  : canUse
                    ? "brass-plate text-amber-100 crt-glow hover:brightness-125"
                    : "chrome-plate text-stone-500 opacity-60 cursor-not-allowed"
              }`}
            >
              {def.name}
            </button>
          );
        })}

        <button
          onClick={() => sendGameIntent("INTENT_FORFEIT", {})}
          data-testid="btn-forfeit"
          className="chamfer-panel px-3 py-1 border border-red-900/80 bg-red-950/80 hover:hazard-stripe text-[11px] font-mono font-bold tracking-widest uppercase text-red-200 crt-glow transition"
          title="Abandon this engagement"
        >
          ▲ Forfeit
        </button>
      </div>
    </div>
  );
}
