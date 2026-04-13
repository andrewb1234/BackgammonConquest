import type {
  GameState,
  PlayerState,
  CampaignState,
  NodeState,
  NodeOwner,
  PlayerRole,
} from "@backgammon-conquest/shared";
import { CAMPAIGN_NODE_COUNT } from "@backgammon-conquest/shared";

// ---------------------------------------------------------
// INTERNAL STATE
// ---------------------------------------------------------

const sessions = new Map<string, GameState>();
const sectorCodeIndex = new Map<string, string>(); // sectorCode → sessionId
const playerSessionIndex = new Map<string, string>(); // playerId → sessionId

// ---------------------------------------------------------
// SECTOR CODE GENERATOR
// ---------------------------------------------------------

function generateSectorCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function generateUniqueSectorCode(): string {
  let code: string;
  do {
    code = generateSectorCode();
  } while (sectorCodeIndex.has(code));
  return code;
}

// ---------------------------------------------------------
// INITIAL STATE FACTORIES
// ---------------------------------------------------------

function createInitialNodes(): [NodeState, ...NodeState[]] {
  const nodes: NodeState[] = [];
  for (let i = 0; i < CAMPAIGN_NODE_COUNT; i++) {
    let owner: NodeOwner = "NEUTRAL";
    if (i === 0) owner = "HOST";
    if (i === CAMPAIGN_NODE_COUNT - 1) owner = "GUEST";
    nodes.push({ nodeId: i, owner, modifierId: "" });
  }
  return nodes as [NodeState, ...NodeState[]];
}

function createPlayer(role: PlayerRole, playerId: string): PlayerState {
  return {
    playerId,
    role,
    faction: null,
    voidScrap: 0,
    loadout: [],
    activeEffects: [],
    connected: true,
  };
}

function createInitialCampaign(hostId: string): CampaignState {
  return {
    nodes: createInitialNodes() as [
      NodeState,
      NodeState,
      NodeState,
      NodeState,
      NodeState,
      NodeState,
      NodeState,
    ],
    activePlayerId: hostId,
  };
}

// ---------------------------------------------------------
// PUBLIC API
// ---------------------------------------------------------

export interface CreateSessionResult {
  sessionId: string;
  sectorCode: string;
  gameState: GameState;
}

export function createSession(hostId: string): CreateSessionResult {
  const sessionId = crypto.randomUUID();
  const sectorCode = generateUniqueSectorCode();

  const gameState: GameState = {
    sessionId,
    stateVersion: 0,
    phase: "LOBBY",
    players: [createPlayer("HOST", hostId), createPlayer("GUEST", "")],
    campaign: createInitialCampaign(hostId),
  };

  sessions.set(sessionId, gameState);
  sectorCodeIndex.set(sectorCode, sessionId);
  playerSessionIndex.set(hostId, sessionId);

  return { sessionId, sectorCode, gameState };
}

export interface JoinSessionResult {
  success: true;
  sessionId: string;
  gameState: GameState;
}

export interface JoinSessionFailure {
  success: false;
  reason: "SESSION_NOT_FOUND" | "SESSION_FULL";
}

export function joinSession(
  sectorCode: string,
  guestId: string,
): JoinSessionResult | JoinSessionFailure {
  const sessionId = sectorCodeIndex.get(sectorCode);
  if (!sessionId) return { success: false, reason: "SESSION_NOT_FOUND" };

  const gameState = sessions.get(sessionId);
  if (!gameState) return { success: false, reason: "SESSION_NOT_FOUND" };

  const guest = gameState.players[1];
  if (guest.playerId !== "") {
    return { success: false, reason: "SESSION_FULL" };
  }

  guest.playerId = guestId;
  guest.connected = true;
  gameState.stateVersion++;
  playerSessionIndex.set(guestId, sessionId);

  return { success: true, sessionId, gameState };
}

export function rejoinSession(
  sessionId: string,
  playerId: string,
): GameState | null {
  const gameState = sessions.get(sessionId);
  if (!gameState) return null;

  const player = gameState.players.find((p) => p.playerId === playerId);
  if (!player) return null;

  player.connected = true;
  gameState.stateVersion++;
  return gameState;
}

export function getSessionByPlayerId(playerId: string): GameState | null {
  const sessionId = playerSessionIndex.get(playerId);
  if (!sessionId) return null;
  return sessions.get(sessionId) ?? null;
}

export function getSession(sessionId: string): GameState | null {
  return sessions.get(sessionId) ?? null;
}

export function markPlayerDisconnected(playerId: string): GameState | null {
  const gameState = getSessionByPlayerId(playerId);
  if (!gameState) return null;

  const player = gameState.players.find((p) => p.playerId === playerId);
  if (player) {
    player.connected = false;
    gameState.stateVersion++;
  }
  return gameState;
}

export function removePlayerFromIndex(playerId: string): void {
  playerSessionIndex.delete(playerId);
}
