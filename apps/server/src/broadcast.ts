import type { Socket } from "socket.io";
import type {
  GameState,
  IntentType,
  StateUpdatePayload,
  RejectIntentPayload,
  PeerDisconnectedPayload,
  PeerReconnectedPayload,
  CriticalErrorPayload,
  RejectionReason,
} from "@backgammon-conquest/shared";

// ---------------------------------------------------------
// SOCKET ROOM HELPERS
// ---------------------------------------------------------

function getRoomId(sessionId: string): string {
  return `session:${sessionId}`;
}

// ---------------------------------------------------------
// BROADCAST: STATE_UPDATE
// ---------------------------------------------------------

export function broadcastStateUpdate(
  io: import("socket.io").Server,
  gameState: GameState,
  delta: string[] = [],
): void {
  const payload: StateUpdatePayload = { gameState, delta };
  io.to(getRoomId(gameState.sessionId)).emit("STATE_UPDATE", payload);
}

// ---------------------------------------------------------
// BROADCAST: REJECT_INTENT
// ---------------------------------------------------------

export function rejectIntent(
  socket: Socket,
  intentType: IntentType,
  reason: RejectionReason,
  serverStateVersion: number,
): void {
  const payload: RejectIntentPayload = { reason, serverStateVersion };
  socket.emit("REJECT_INTENT", { type: intentType, ...payload });
}

// ---------------------------------------------------------
// BROADCAST: PEER_DISCONNECTED
// ---------------------------------------------------------

export function broadcastPeerDisconnected(
  io: import("socket.io").Server,
  sessionId: string,
  clientId: string,
  reconnectGracePeriodMs: number,
): void {
  const payload: PeerDisconnectedPayload = {
    clientId,
    reconnectGracePeriodMs,
  };
  io.to(getRoomId(sessionId)).emit("PEER_DISCONNECTED", payload);
}

// ---------------------------------------------------------
// BROADCAST: PEER_RECONNECTED
// ---------------------------------------------------------

export function broadcastPeerReconnected(
  io: import("socket.io").Server,
  sessionId: string,
  clientId: string,
): void {
  const payload: PeerReconnectedPayload = { clientId };
  io.to(getRoomId(sessionId)).emit("PEER_RECONNECTED", payload);
}

// ---------------------------------------------------------
// BROADCAST: CRITICAL_ERROR
// ---------------------------------------------------------

export function broadcastCriticalError(
  io: import("socket.io").Server,
  sessionId: string,
  message: string,
  code: number,
): void {
  const payload: CriticalErrorPayload = { message, code };
  io.to(getRoomId(sessionId)).emit("CRITICAL_ERROR", payload);
}

// ---------------------------------------------------------
// ROOM MANAGEMENT
// ---------------------------------------------------------

export function joinRoom(socket: Socket, sessionId: string): void {
  socket.join(getRoomId(sessionId));
}

export function leaveRoom(socket: Socket, sessionId: string): void {
  socket.leave(getRoomId(sessionId));
}
