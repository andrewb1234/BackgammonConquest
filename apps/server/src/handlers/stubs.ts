import type { Socket } from "socket.io";
import type { Server as SocketServer } from "socket.io";
import type {
  IntentType,
  SocketMessage,
  ReadyLoadoutPayload,
  IntentUseItemPayload,
  IntentInvokeEscalationPayload,
  IntentRespondEscalationPayload,
} from "@backgammon-conquest/shared";
import { getSessionByPlayerId } from "../sessionManager.js";
import { rejectIntent } from "../broadcast.js";

// ---------------------------------------------------------
// VERSION CHECK HELPER
// ---------------------------------------------------------

function checkStaleState(
  socket: Socket,
  intentType: IntentType,
  incomingVersion: number,
  serverVersion: number,
): boolean {
  if (incomingVersion < serverVersion) {
    rejectIntent(socket, intentType, "STALE_STATE", serverVersion);
    return true;
  }
  return false;
}

// ---------------------------------------------------------
// STUB HANDLERS — reject with INVALID_PHASE until game logic is implemented
// ---------------------------------------------------------

export function handleReadyLoadout(
  _io: SocketServer,
  socket: Socket,
  msg: SocketMessage<ReadyLoadoutPayload>,
): void {
  const gameState = getSessionByPlayerId((socket.data as { clientId?: string }).clientId ?? "");
  if (!gameState) {
    rejectIntent(socket, "READY_LOADOUT", "INVALID_PHASE", 0);
    return;
  }
  if (checkStaleState(socket, "READY_LOADOUT", msg.payload.stateVersion, gameState.stateVersion)) return;

  rejectIntent(socket, "READY_LOADOUT", "INVALID_PHASE", gameState.stateVersion);
}

export function handleIntentUseItem(
  _io: SocketServer,
  socket: Socket,
  msg: SocketMessage<IntentUseItemPayload>,
): void {
  const gameState = getSessionByPlayerId((socket.data as { clientId?: string }).clientId ?? "");
  if (!gameState) {
    rejectIntent(socket, "INTENT_USE_ITEM", "INVALID_PHASE", 0);
    return;
  }
  if (checkStaleState(socket, "INTENT_USE_ITEM", msg.payload.stateVersion, gameState.stateVersion)) return;

  rejectIntent(socket, "INTENT_USE_ITEM", "INVALID_PHASE", gameState.stateVersion);
}

export function handleIntentInvokeEscalation(
  _io: SocketServer,
  socket: Socket,
  msg: SocketMessage<IntentInvokeEscalationPayload>,
): void {
  const gameState = getSessionByPlayerId((socket.data as { clientId?: string }).clientId ?? "");
  if (!gameState) {
    rejectIntent(socket, "INTENT_INVOKE_ESCALATION", "INVALID_PHASE", 0);
    return;
  }
  if (checkStaleState(socket, "INTENT_INVOKE_ESCALATION", msg.payload.stateVersion, gameState.stateVersion)) return;

  rejectIntent(socket, "INTENT_INVOKE_ESCALATION", "ESCALATION_NOT_ALLOWED", gameState.stateVersion);
}

export function handleIntentRespondEscalation(
  _io: SocketServer,
  socket: Socket,
  msg: SocketMessage<IntentRespondEscalationPayload>,
): void {
  const gameState = getSessionByPlayerId((socket.data as { clientId?: string }).clientId ?? "");
  if (!gameState) {
    rejectIntent(socket, "INTENT_RESPOND_ESCALATION", "INVALID_PHASE", 0);
    return;
  }
  if (checkStaleState(socket, "INTENT_RESPOND_ESCALATION", msg.payload.stateVersion, gameState.stateVersion)) return;

  rejectIntent(socket, "INTENT_RESPOND_ESCALATION", "ESCALATION_NOT_ALLOWED", gameState.stateVersion);
}
