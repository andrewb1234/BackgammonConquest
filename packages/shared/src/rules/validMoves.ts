import type { BoardState, PlayerRole, Point } from "../state/index.js";
import { BOARD_POINT_COUNT } from "../constants/index.js";
import { getDirection, isAllInHomeBoard } from "./boardSetup.js";

// ---------------------------------------------------------
// MOVE REPRESENTATION
// ---------------------------------------------------------

export interface ValidMove {
  fromPoint: number | "BAR";
  toPoint: number;
  dieUsed: number;
  isBearingOff: boolean;
}

// ---------------------------------------------------------
// POINT ACCESS HELPERS
// ---------------------------------------------------------

function getPoint(board: BoardState, index: number): Point {
  return board.points[index];
}

function isPointOpen(point: Point, role: PlayerRole): boolean {
  // Open if: empty, owned by player, or has exactly 1 opponent piece (hit)
  if (point.owner === null || point.owner === role) return true;
  if (point.count === 1) return true; // can hit
  return false;
}

// ---------------------------------------------------------
// SINGLE DIE MOVE GENERATION
// ---------------------------------------------------------

function movesForDie(
  board: BoardState,
  role: PlayerRole,
  die: number,
): ValidMove[] {
  const dir = getDirection(role);
  const moves: ValidMove[] = [];

  // Must enter from bar first
  if (board.bars[role] > 0) {
    const entryPoint = role === "HOST" ? (24 - die) : (die - 1);
    if (entryPoint >= 0 && entryPoint < BOARD_POINT_COUNT) {
      const point = getPoint(board, entryPoint);
      if (isPointOpen(point, role)) {
        moves.push({
          fromPoint: "BAR",
          toPoint: entryPoint,
          dieUsed: die,
          isBearingOff: false,
        });
      }
    }
    return moves; // Can't move other pieces while on bar
  }

  const allHome = isAllInHomeBoard(board, role);

  for (let i = 0; i < BOARD_POINT_COUNT; i++) {
    if (board.points[i].owner !== role || board.points[i].count === 0) continue;

    const destIndex = i + dir * die;

    // Bearing off
    if (role === "HOST" && destIndex < 0) {
      if (!allHome) continue;
      // Exact or highest occupied point
      if (destIndex === -1) {
        // Exact bear off
        moves.push({ fromPoint: i, toPoint: -1, dieUsed: die, isBearingOff: true });
      } else if (destIndex < -1) {
        // Overshoot: only allowed if no pieces on higher points
        let hasHigher = false;
        for (let j = i + 1; j <= 5; j++) {
          if (board.points[j].owner === role && board.points[j].count > 0) {
            hasHigher = true;
            break;
          }
        }
        if (!hasHigher) {
          moves.push({ fromPoint: i, toPoint: -1, dieUsed: die, isBearingOff: true });
        }
      }
      continue;
    }

    if (role === "GUEST" && destIndex > 23) {
      if (!allHome) continue;
      if (destIndex === 24) {
        moves.push({ fromPoint: i, toPoint: 24, dieUsed: die, isBearingOff: true });
      } else if (destIndex > 24) {
        let hasLower = false;
        for (let j = i - 1; j >= 18; j--) {
          if (board.points[j].owner === role && board.points[j].count > 0) {
            hasLower = true;
            break;
          }
        }
        if (!hasLower) {
          moves.push({ fromPoint: i, toPoint: 24, dieUsed: die, isBearingOff: true });
        }
      }
      continue;
    }

    // Normal move
    if (destIndex >= 0 && destIndex < BOARD_POINT_COUNT) {
      const destPoint = getPoint(board, destIndex);
      if (isPointOpen(destPoint, role)) {
        moves.push({ fromPoint: i, toPoint: destIndex, dieUsed: die, isBearingOff: false });
      }
    }
  }

  return moves;
}

// ---------------------------------------------------------
// FULL MOVE SET (all dice combinations)
// ---------------------------------------------------------

export function getValidMoves(
  board: BoardState,
  role: PlayerRole,
  dice: number[],
  diceUsed: boolean[],
): ValidMove[] {
  const moves: ValidMove[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < dice.length; i++) {
    if (diceUsed[i]) continue;

    const dieMoves = movesForDie(board, role, dice[i]);
    for (const move of dieMoves) {
      const key = `${move.fromPoint}:${move.toPoint}:${move.dieUsed}`;
      if (!seen.has(key)) {
        seen.add(key);
        moves.push(move);
      }
    }
  }

  return moves;
}

// ---------------------------------------------------------
// MOVE APPLICATION
// ---------------------------------------------------------

export interface MoveResult {
  board: BoardState;
  hit: boolean;
}

export function applyMove(
  board: BoardState,
  role: PlayerRole,
  move: ValidMove,
): MoveResult {
  const newBoard: BoardState = {
    points: board.points.map((p) => ({ ...p, activeEffects: [...p.activeEffects] })),
    bars: { ...board.bars },
    borneOff: { ...board.borneOff },
  };

  let hit = false;

  // Remove from source
  if (move.fromPoint === "BAR") {
    newBoard.bars[role]--;
  } else {
    newBoard.points[move.fromPoint].count--;
    if (newBoard.points[move.fromPoint].count === 0) {
      newBoard.points[move.fromPoint].owner = null;
    }
  }

  // Place at destination
  if (move.isBearingOff) {
    newBoard.borneOff[role]++;
  } else {
    const dest = newBoard.points[move.toPoint];
    if (dest.owner !== null && dest.owner !== role && dest.count === 1) {
      // Hit! Send opponent to bar
      const opponent = dest.owner as PlayerRole;
      newBoard.bars[opponent]++;
      dest.count = 0;
      dest.owner = null;
      hit = true;
    }

    dest.owner = role;
    dest.count++;
  }

  return { board: newBoard, hit };
}

/**
 * Check if any valid moves exist for the current dice.
 */
export function hasAnyValidMove(
  board: BoardState,
  role: PlayerRole,
  dice: number[],
  diceUsed: boolean[],
): boolean {
  return getValidMoves(board, role, dice, diceUsed).length > 0;
}
