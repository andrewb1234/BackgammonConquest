import type { BoardState, Point, PlayerRole } from "../state/index.js";
import { BOARD_POINT_COUNT, PIECES_PER_PLAYER } from "../constants/index.js";

/**
 * Standard backgammon initial setup.
 * HOST moves from point 23 → 0 (high to low).
 * GUEST moves from point 0 → 23 (low to high).
 *
 * Point indices are 0-based (0 = HOST home, 23 = GUEST home).
 */
export function createInitialBoard(): BoardState {
  const points: Point[] = Array.from({ length: BOARD_POINT_COUNT }, () => ({
    owner: null,
    count: 0,
    activeEffects: [],
  }));

  // HOST pieces (moves 23 → 0)
  points[23] = { owner: "HOST", count: 2, activeEffects: [] };
  points[12] = { owner: "HOST", count: 5, activeEffects: [] };
  points[7]  = { owner: "HOST", count: 3, activeEffects: [] };
  points[5]  = { owner: "HOST", count: 5, activeEffects: [] };

  // GUEST pieces (moves 0 → 23)
  points[0]  = { owner: "GUEST", count: 2, activeEffects: [] };
  points[11] = { owner: "GUEST", count: 5, activeEffects: [] };
  points[16] = { owner: "GUEST", count: 3, activeEffects: [] };
  points[18] = { owner: "GUEST", count: 5, activeEffects: [] };

  return {
    points,
    bars: { HOST: 0, GUEST: 0 },
    borneOff: { HOST: 0, GUEST: 0 },
  };
}

/**
 * Direction multiplier: HOST moves -1 (23→0), GUEST moves +1 (0→23).
 */
export function getDirection(role: PlayerRole): number {
  return role === "HOST" ? -1 : 1;
}

/**
 * Check if a player has all remaining pieces in their home board.
 * HOST home = points 0–5, GUEST home = points 18–23.
 */
export function isAllInHomeBoard(board: BoardState, role: PlayerRole): boolean {
  const { points, bars } = board;

  // Nothing on the bar
  if (bars[role] > 0) return false;

  if (role === "HOST") {
    // All pieces must be in points 0–5 or borne off
    for (let i = 6; i < BOARD_POINT_COUNT; i++) {
      if (points[i].owner === role && points[i].count > 0) return false;
    }
  } else {
    // All pieces must be in points 18–23 or borne off
    for (let i = 0; i < 18; i++) {
      if (points[i].owner === role && points[i].count > 0) return false;
    }
  }

  return true;
}

/**
 * Check if a player has won (all 15 pieces borne off).
 */
export function isWin(board: BoardState, role: PlayerRole): boolean {
  return board.borneOff[role] === PIECES_PER_PLAYER;
}
