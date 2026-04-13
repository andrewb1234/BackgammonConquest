import type { Socket } from "socket.io";
import type {
  Server as SocketServer,
} from "socket.io";
import type {
  CreateSessionPayload,
  JoinSessionPayload,
  RejoinSessionPayload,
  SocketMessage,
} from "@backgammon-conquest/shared";
import {
  createSession,
  joinSession,
  rejoinSession,
  getSessionByPlayerId,
} from "../sessionManager.js";
import {
  broadcastStateUpdate,
  rejectIntent,
  joinRoom,
  broadcastPeerReconnected,
} from "../broadcast.js";

// ---------------------------------------------------------
// CREATE_SESSION
// ---------------------------------------------------------

export function handleCreateSession(
  io: SocketServer,
  socket: Socket,
  msg: SocketMessage<CreateSessionPayload>,
): void {
  const { clientId } = msg.payload;

  const existing = getSessionByPlayerId(clientId);
  if (existing) {
    rejectIntent(socket, "CREATE_SESSION", "INVALID_PHASE", existing.stateVersion);
    return;
  }

  const result = createSession(clientId);
  joinRoom(socket, result.sessionId);

  socket.emit("SESSION_CREATED", {
    sessionId: result.sessionId,
    sectorCode: result.sectorCode,
  });

  broadcastStateUpdate(io, result.gameState, ["phase", "players"]);
}

// ---------------------------------------------------------
// JOIN_SESSION
// ---------------------------------------------------------

export function handleJoinSession(
  io: SocketServer,
  socket: Socket,
  msg: SocketMessage<JoinSessionPayload>,
): void {
  const { clientId, sectorCode } = msg.payload;

  const result = joinSession(sectorCode, clientId);

  if (!result.success) {
    const reason = result.reason === "SESSION_NOT_FOUND"
      ? "INVALID_TARGET"
      : "INVALID_PHASE";
    rejectIntent(socket, "JOIN_SESSION", reason, 0);
    return;
  }

  joinRoom(socket, result.sessionId);

  socket.emit("SESSION_JOINED", {
    sessionId: result.sessionId,
  });

  broadcastStateUpdate(io, result.gameState, ["players[1]"]);
}

// ---------------------------------------------------------
// REJOIN_SESSION
// ---------------------------------------------------------

export function handleRejoinSession(
  io: SocketServer,
  socket: Socket,
  msg: SocketMessage<RejoinSessionPayload>,
): void {
  const { clientId, sessionId } = msg.payload;

  const gameState = rejoinSession(sessionId, clientId);
  if (!gameState) {
    rejectIntent(socket, "REJOIN_SESSION", "INVALID_TARGET", 0);
    return;
  }

  joinRoom(socket, sessionId);
  broadcastPeerReconnected(io, sessionId, clientId);
  broadcastStateUpdate(io, gameState, [`players`]);
}
