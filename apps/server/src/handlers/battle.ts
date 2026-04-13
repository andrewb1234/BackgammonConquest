import type { Socket } from "socket.io";
import type { Server as SocketServer } from "socket.io";
import type {
  IntentRollPayload,
  IntentMovePayload,
  SocketMessage,
  PlayerRole,
} from "@backgammon-conquest/shared";
import {
  getValidMoves,
  applyMove,
  isWin,
  hasAnyValidMove,
} from "@backgammon-conquest/shared";
import { getSessionByPlayerId } from "../sessionManager.js";
import { broadcastStateUpdate, rejectIntent } from "../broadcast.js";

function getPlayerRole(gameState: any, playerId: string): PlayerRole | null {
  const player = gameState.players.find((p: any) => p.playerId === playerId);
  return player?.role ?? null;
}

// ---------------------------------------------------------
// INTENT_ROLL
// ---------------------------------------------------------

export function handleIntentRoll(
  io: SocketServer,
  socket: Socket,
  msg: SocketMessage<IntentRollPayload>,
): void {
  const { clientId } = socket.data as { clientId?: string };
  const playerId = clientId ?? "";
  const gameState = getSessionByPlayerId(playerId);

  if (!gameState) {
    rejectIntent(socket, "INTENT_ROLL", "INVALID_PHASE", 0);
    return;
  }

  if (gameState.phase !== "BATTLE" || !gameState.battle) {
    rejectIntent(socket, "INTENT_ROLL", "INVALID_PHASE", gameState.stateVersion);
    return;
  }

  if (gameState.battle.activePlayerId !== playerId) {
    rejectIntent(socket, "INTENT_ROLL", "NOT_ACTIVE_PLAYER", gameState.stateVersion);
    return;
  }

  if (msg.payload.stateVersion < gameState.stateVersion) {
    rejectIntent(socket, "INTENT_ROLL", "STALE_STATE", gameState.stateVersion);
    return;
  }

  if (gameState.battle.dice !== null) {
    rejectIntent(socket, "INTENT_ROLL", "INVALID_PHASE", gameState.stateVersion);
    return;
  }

  // Server-authoritative dice roll
  const die1 = Math.floor(Math.random() * 6) + 1;
  const die2 = Math.floor(Math.random() * 6) + 1;
  const isDoubles = die1 === die2;

  const dice = isDoubles
    ? [die1, die1, die1, die1]
    : [die1, die2];

  gameState.battle.dice = dice;
  gameState.battle.diceUsed = new Array(dice.length).fill(false);
  gameState.battle.turnCount++;
  gameState.stateVersion++;

  // Check if player has any valid moves — if not, auto-pass
  const role = getPlayerRole(gameState, playerId);
  if (role && !hasAnyValidMove(gameState.battle.board, role, dice, gameState.battle.diceUsed)) {
    passTurn(gameState);
  }

  broadcastStateUpdate(io, gameState, ["battle.dice", "battle.diceUsed", "battle.turnCount"]);
}

// ---------------------------------------------------------
// INTENT_MOVE
// ---------------------------------------------------------

export function handleIntentMove(
  io: SocketServer,
  socket: Socket,
  msg: SocketMessage<IntentMovePayload>,
): void {
  const { clientId } = socket.data as { clientId?: string };
  const playerId = clientId ?? "";
  const gameState = getSessionByPlayerId(playerId);

  if (!gameState) {
    rejectIntent(socket, "INTENT_MOVE", "INVALID_PHASE", 0);
    return;
  }

  if (gameState.phase !== "BATTLE" || !gameState.battle) {
    rejectIntent(socket, "INTENT_MOVE", "INVALID_PHASE", gameState.stateVersion);
    return;
  }

  if (gameState.battle.activePlayerId !== playerId) {
    rejectIntent(socket, "INTENT_MOVE", "NOT_ACTIVE_PLAYER", gameState.stateVersion);
    return;
  }

  if (msg.payload.stateVersion < gameState.stateVersion) {
    rejectIntent(socket, "INTENT_MOVE", "STALE_STATE", gameState.stateVersion);
    return;
  }

  if (gameState.battle.dice === null) {
    rejectIntent(socket, "INTENT_MOVE", "INVALID_PHASE", gameState.stateVersion);
    return;
  }

  const role = getPlayerRole(gameState, playerId);
  if (!role) {
    rejectIntent(socket, "INTENT_MOVE", "NOT_ACTIVE_PLAYER", gameState.stateVersion);
    return;
  }

  const { moves } = msg.payload;
  const battle = gameState.battle;
  const dice = battle.dice!; // guaranteed non-null after the guard above
  const validMoves = getValidMoves(battle.board, role, dice, battle.diceUsed);

  // Validate each move in sequence
  let currentBoard = battle.board;
  const usedDiceIndices: number[] = [];
  const deltas: string[] = [];

  for (const move of moves) {
    // Find matching valid move
    const matching = validMoves.find((vm) =>
      vm.fromPoint === move.fromPoint &&
      vm.toPoint === move.toPoint &&
      vm.dieUsed === move.dieUsed &&
      !usedDiceIndices.some((idx) => vm.dieUsed === dice[idx] && battle.diceUsed[idx])
    );

    if (!matching) {
      rejectIntent(socket, "INTENT_MOVE", "INVALID_MOVE", gameState.stateVersion);
      return;
    }

    // Find the die index to consume
    let dieIndex = -1;
    for (let i = 0; i < dice.length; i++) {
      if (!battle.diceUsed[i] && dice[i] === move.dieUsed) {
        // Check this die index isn't already claimed for a prior move in this batch
        if (!usedDiceIndices.includes(i)) {
          dieIndex = i;
          break;
        }
      }
    }

    if (dieIndex === -1) {
      rejectIntent(socket, "INTENT_MOVE", "INVALID_MOVE", gameState.stateVersion);
      return;
    }

    // Apply the move
    const result = applyMove(currentBoard, role, matching);
    currentBoard = result.board;
    usedDiceIndices.push(dieIndex);
    battle.diceUsed[dieIndex] = true;

    if (matching.isBearingOff) {
      deltas.push(`battle.board.borneOff`);
    }
    if (result.hit) {
      deltas.push(`battle.board.bars`);
    }
  }

  // Commit the board state
  battle.board = currentBoard;
  gameState.stateVersion++;

  deltas.push("battle.board.points", "battle.diceUsed");

  // Win check
  if (isWin(battle.board, role)) {
    gameState.phase = "RESOLUTION";
    gameState.stateVersion++;
    deltas.push("phase");
  } else if (allDiceUsed(battle)) {
    // All dice used — pass turn
    passTurn(gameState);
    deltas.push("battle.activePlayerId");
  } else if (battle.dice && !hasAnyValidMove(battle.board, role, battle.dice, battle.diceUsed)) {
    // No more valid moves — pass turn
    passTurn(gameState);
    deltas.push("battle.activePlayerId");
  }

  broadcastStateUpdate(io, gameState, deltas);
}

// ---------------------------------------------------------
// HELPERS
// ---------------------------------------------------------

function allDiceUsed(battle: any): boolean {
  return battle.diceUsed.every((u: boolean) => u);
}

function passTurn(gameState: any): void {
  const battle = gameState.battle;
  const currentId = battle.activePlayerId;
  const otherPlayer = gameState.players.find((p: any) => p.playerId !== currentId);
  battle.activePlayerId = otherPlayer.playerId;
  battle.dice = null;
  battle.diceUsed = [];
}
