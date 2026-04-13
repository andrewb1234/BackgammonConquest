import type { Socket } from "socket.io";
import type { Server as SocketServer } from "socket.io";
import type {
  AcknowledgeResultPayload,
  IntentForfeitPayload,
  SocketMessage,
  PlayerRole,
} from "@backgammon-conquest/shared";
import { getSessionByPlayerId } from "../sessionManager.js";
import { broadcastStateUpdate, rejectIntent } from "../broadcast.js";

// ---------------------------------------------------------
// HELPERS
// ---------------------------------------------------------

function getPlayerRole(gameState: any, playerId: string): PlayerRole | null {
  const player = gameState.players.find((p: any) => p.playerId === playerId);
  return player?.role ?? null;
}

/**
 * Determine battle winner from the board state.
 * The winner is the player who has borne off all 15 pieces.
 * If in RESOLUTION phase, we check borneOff counts.
 */
function getBattleWinner(gameState: any): PlayerRole | null {
  if (!gameState.battle) return null;
  const borneOff = gameState.battle.board.borneOff;
  if (borneOff.HOST === 15) return "HOST";
  if (borneOff.GUEST === 15) return "GUEST";
  return null;
}

/**
 * Capital nodes: HOST capital = node 0, GUEST capital = node 6.
 */
const CAPITAL_NODES: Record<PlayerRole, number> = {
  HOST: 0,
  GUEST: 6,
};

// Server-side acknowledgment tracking (not part of GameState broadcast)
const acknowledgmentTracker = new Map<string, Set<string>>();

// ---------------------------------------------------------
// ACKNOWLEDGE_RESULT
// ---------------------------------------------------------

export function handleAcknowledgeResult(
  io: SocketServer,
  socket: Socket,
  msg: SocketMessage<AcknowledgeResultPayload>,
): void {
  const { clientId } = socket.data as { clientId?: string };
  const playerId = clientId ?? "";
  const gameState = getSessionByPlayerId(playerId);

  if (!gameState) {
    rejectIntent(socket, "ACKNOWLEDGE_RESULT", "INVALID_PHASE", 0);
    return;
  }

  if (gameState.phase !== "RESOLUTION") {
    rejectIntent(socket, "ACKNOWLEDGE_RESULT", "INVALID_PHASE", gameState.stateVersion);
    return;
  }

  if (msg.payload.stateVersion < gameState.stateVersion) {
    rejectIntent(socket, "ACKNOWLEDGE_RESULT", "STALE_STATE", gameState.stateVersion);
    return;
  }

  const role = getPlayerRole(gameState, playerId);
  if (!role) {
    rejectIntent(socket, "ACKNOWLEDGE_RESULT", "NOT_ACTIVE_PLAYER", gameState.stateVersion);
    return;
  }

  // Track acknowledgments — both players must ack before proceeding
  const sessionId = gameState.sessionId;
  if (!acknowledgmentTracker.has(sessionId)) {
    acknowledgmentTracker.set(sessionId, new Set<string>());
  }
  const ackSet = acknowledgmentTracker.get(sessionId)!;
  ackSet.add(playerId);

  // If not both players have acknowledged yet, just confirm receipt
  if (ackSet.size < 2) {
    gameState.stateVersion++;
    broadcastStateUpdate(io, gameState, []);
    return;
  }

  // Both acknowledged — resolve the battle result
  const winner = getBattleWinner(gameState);
  const contestedNodeId = gameState.battle?.contestedNodeId ?? -1;

  // Clear acknowledgment tracking
  acknowledgmentTracker.delete(sessionId);

  if (winner && contestedNodeId >= 0) {
    // Update node ownership: winner takes the contested node
    const node = gameState.campaign.nodes[contestedNodeId];
    if (node) {
      node.owner = winner;
    }

    // Check capital capture (global win condition)
    const loserRole: PlayerRole = winner === "HOST" ? "GUEST" : "HOST";
    const loserCapital = CAPITAL_NODES[loserRole];

    if (contestedNodeId === loserCapital) {
      // Capital captured — global win!
      gameState.phase = "RESOLUTION"; // stays RESOLUTION but now it's campaign-level
      gameState.campaignWinner = winner;
      gameState.stateVersion++;
      broadcastStateUpdate(io, gameState, ["phase", "campaign.nodes", "campaignWinner"]);
      return;
    }
  }

  // No capital capture — transition back to CAMPAIGN
  gameState.battle = undefined;
  gameState.phase = "CAMPAIGN";

  // Switch active player for next campaign turn
  const currentActive = gameState.campaign.activePlayerId;
  const otherPlayer = gameState.players.find((p: any) => p.playerId !== currentActive);
  if (otherPlayer) {
    gameState.campaign.activePlayerId = otherPlayer.playerId;
  }

  gameState.stateVersion++;
  broadcastStateUpdate(io, gameState, ["phase", "battle", "campaign.nodes", "campaign.activePlayerId"]);
}

// ---------------------------------------------------------
// INTENT_FORFEIT
// ---------------------------------------------------------

export function handleIntentForfeit(
  io: SocketServer,
  socket: Socket,
  msg: SocketMessage<IntentForfeitPayload>,
): void {
  const { clientId } = socket.data as { clientId?: string };
  const playerId = clientId ?? "";
  const gameState = getSessionByPlayerId(playerId);

  if (!gameState) {
    rejectIntent(socket, "INTENT_FORFEIT", "INVALID_PHASE", 0);
    return;
  }

  if (msg.payload.stateVersion < gameState.stateVersion) {
    rejectIntent(socket, "INTENT_FORFEIT", "STALE_STATE", gameState.stateVersion);
    return;
  }

  // Can forfeit during BATTLE or CAMPAIGN phases
  if (gameState.phase !== "BATTLE" && gameState.phase !== "CAMPAIGN") {
    rejectIntent(socket, "INTENT_FORFEIT", "INVALID_PHASE", gameState.stateVersion);
    return;
  }

  const role = getPlayerRole(gameState, playerId);
  if (!role) {
    rejectIntent(socket, "INTENT_FORFEIT", "NOT_ACTIVE_PLAYER", gameState.stateVersion);
    return;
  }

  // The forfeiting player loses — opponent wins
  const winnerRole: PlayerRole = role === "HOST" ? "GUEST" : "HOST";

  // If in battle, the contested node goes to the winner
  if (gameState.battle) {
    const contestedNodeId = gameState.battle.contestedNodeId;
    const node = gameState.campaign.nodes[contestedNodeId];
    if (node) {
      node.owner = winnerRole;
    }

    // Check capital capture
    const loserCapital = CAPITAL_NODES[role];
    if (contestedNodeId === loserCapital) {
      gameState.phase = "RESOLUTION";
      gameState.campaignWinner = winnerRole;
      gameState.battle = undefined;
      gameState.stateVersion++;
      broadcastStateUpdate(io, gameState, ["phase", "battle", "campaign.nodes", "campaignWinner"]);
      return;
    }
  }

  // Transition to RESOLUTION (battle forfeit = opponent wins the battle)
  gameState.phase = "RESOLUTION";
  gameState.campaignWinner = winnerRole; // forfeit = full campaign loss
  gameState.battle = undefined;
  gameState.stateVersion++;

  broadcastStateUpdate(io, gameState, ["phase", "battle", "campaign.nodes", "campaignWinner"]);
}
