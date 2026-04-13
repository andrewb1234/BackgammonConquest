import type { Socket } from "socket.io";
import type { Server as SocketServer } from "socket.io";
import type {
  LockFactionPayload,
  SocketMessage,
} from "@backgammon-conquest/shared";
import { getSessionByPlayerId } from "../sessionManager.js";
import { broadcastStateUpdate, rejectIntent } from "../broadcast.js";

// ---------------------------------------------------------
// LOCK_FACTION
// ---------------------------------------------------------

export function handleLockFaction(
  io: SocketServer,
  socket: Socket,
  msg: SocketMessage<LockFactionPayload>,
): void {
  const { clientId } = socket.data as { clientId?: string };
  const playerId = clientId ?? "";
  const gameState = getSessionByPlayerId(playerId);

  if (!gameState) {
    rejectIntent(socket, "LOCK_FACTION", "INVALID_PHASE", 0);
    return;
  }

  if (gameState.phase !== "LOBBY") {
    rejectIntent(socket, "LOCK_FACTION", "INVALID_PHASE", gameState.stateVersion);
    return;
  }

  const player = gameState.players.find((p) => p.playerId === playerId);
  if (!player) {
    rejectIntent(socket, "LOCK_FACTION", "NOT_ACTIVE_PLAYER", gameState.stateVersion);
    return;
  }

  const { faction } = msg.payload;
  const otherPlayer = gameState.players.find((p) => p.playerId !== playerId);

  if (otherPlayer && otherPlayer.faction === faction) {
    rejectIntent(socket, "LOCK_FACTION", "INVALID_TARGET", gameState.stateVersion);
    return;
  }

  player.faction = faction;
  gameState.stateVersion++;

  // Check if both factions are locked → transition to CAMPAIGN
  const bothLocked = gameState.players.every((p) => p.faction !== null);
  if (bothLocked) {
    gameState.phase = "CAMPAIGN";
    gameState.stateVersion++;
  }

  const delta = bothLocked
    ? ["players", "phase"]
    : ["players"];

  broadcastStateUpdate(io, gameState, delta);
}
