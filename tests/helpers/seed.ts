import type { BoardState, GameState, PlayerRole } from "@backgammon-conquest/shared";

/**
 * Helpers for Playwright state injection via the server-side /__test__
 * endpoints. These functions intentionally return raw JSON rather than
 * typed gameState so specs can assert against arbitrary fields without
 * type gymnastics.
 */

const SERVER_URL =
  process.env.TEST_SERVER_URL ?? "http://localhost:3099";

export interface SeedBattleRequest {
  /** Partial GameState deep-merged over the default two-player lobby state. */
  state?: Partial<GameState>;
  /** Optional deterministic client IDs; defaults to server-generated ones. */
  hostClientId?: string;
  guestClientId?: string;
}

export interface SeedBattleResponse {
  sessionId: string;
  sectorCode: string;
  hostClientId: string;
  guestClientId: string;
  gameState: GameState;
}

export async function seedBattle(
  req: SeedBattleRequest,
): Promise<SeedBattleResponse> {
  const resp = await fetch(`${SERVER_URL}/__test__/seed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(
      `seedBattle failed: ${resp.status} ${resp.statusText} — ${text}`,
    );
  }
  return (await resp.json()) as SeedBattleResponse;
}

export async function resetSessions(): Promise<void> {
  const resp = await fetch(`${SERVER_URL}/__test__/reset`, {
    method: "POST",
  });
  if (!resp.ok) {
    throw new Error(`resetSessions failed: ${resp.status}`);
  }
}

/**
 * Queue a deterministic sequence of dice values for subsequent INTENT_ROLL
 * calls. The server consumes two values per roll (die1, die2). Pass `null`
 * (or omit) to clear the seed and fall back to Math.random().
 *
 * Example: seedDice([3, 5, 6, 6]) → first roll yields [3, 5], next roll
 * yields [6, 6, 6, 6] (doubles).
 */
export async function seedDice(dice: number[] | null): Promise<void> {
  const resp = await fetch(`${SERVER_URL}/__test__/dice-seed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dice }),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`seedDice failed: ${resp.status} ${resp.statusText} — ${text}`);
  }
}

// ---------------------------------------------------------------------
// BOARD SCENARIO BUILDERS
// ---------------------------------------------------------------------

function emptyBoard(): BoardState {
  const points = Array.from({ length: 24 }, () => ({
    owner: null as PlayerRole | null,
    count: 0,
    activeEffects: [] as never[],
  }));
  return {
    points,
    bars: { HOST: 0, GUEST: 0 },
    borneOff: { HOST: 0, GUEST: 0 },
  };
}

/**
 * Build a board where HOST has exactly one piece left on a single home-board
 * point, with 14 already borne off, and GUEST has a single blocking piece far
 * away. Lets a single test turn complete Orbital Evacuation.
 */
export function boardHostOneLeftInHome(
  hostPointIndex: number,
  guestPointIndex = 23,
): BoardState {
  const b = emptyBoard();
  b.points[hostPointIndex] = { owner: "HOST", count: 1, activeEffects: [] };
  b.points[guestPointIndex] = { owner: "GUEST", count: 15, activeEffects: [] };
  b.borneOff = { HOST: 14, GUEST: 0 };
  return b;
}

/**
 * Build a board with a single GUEST blot sitting in HOST's path so HOST can
 * hit it with a precise die roll.
 */
export function boardGuestBlotInHostPath(
  guestBlotIndex: number,
  hostStagingIndex: number,
): BoardState {
  const b = emptyBoard();
  b.points[hostStagingIndex] = { owner: "HOST", count: 5, activeEffects: [] };
  b.points[guestBlotIndex] = { owner: "GUEST", count: 1, activeEffects: [] };
  // Pad GUEST total to 15 so the game remains legal.
  b.points[0] = { owner: "GUEST", count: 14, activeEffects: [] };
  return b;
}
