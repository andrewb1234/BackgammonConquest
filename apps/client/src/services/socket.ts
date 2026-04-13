import { io, Socket } from "socket.io-client";
import type { IntentType, SocketMessage } from "@backgammon-conquest/shared";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:3001";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, { autoConnect: false });
  }
  return socket;
}

export function connectSocket(): Socket {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
  }
  return s;
}

export function identify(clientId: string): void {
  const s = getSocket();
  s.emit("IDENTIFY", clientId);
}

export function sendIntent<T>(type: IntentType, payload: T): void {
  const s = getSocket();
  const msg: SocketMessage<T> = {
    type,
    eventId: crypto.randomUUID(),
    payload,
    timestamp: Date.now(),
  };
  s.emit("INTENT", msg);
}

export function onSessionCreated(
  handler: (payload: { sessionId: string; sectorCode: string }) => void,
): () => void {
  const s = getSocket();
  s.on("SESSION_CREATED", handler);
  return () => { s.off("SESSION_CREATED", handler); };
}

export function onSessionJoined(
  handler: (payload: { sessionId: string }) => void,
): () => void {
  const s = getSocket();
  s.on("SESSION_JOINED", handler);
  return () => { s.off("SESSION_JOINED", handler); };
}

export function onStateUpdate(
  handler: (payload: { gameState: any; delta: string[] }) => void,
): () => void {
  const s = getSocket();
  s.on("STATE_UPDATE", handler);
  return () => { s.off("STATE_UPDATE", handler); };
}

export function onRejectIntent(
  handler: (payload: { type: string; reason: string; serverStateVersion: number }) => void,
): () => void {
  const s = getSocket();
  s.on("REJECT_INTENT", handler);
  return () => { s.off("REJECT_INTENT", handler); };
}

export function onPeerDisconnected(
  handler: (payload: { clientId: string; reconnectGracePeriodMs: number }) => void,
): () => void {
  const s = getSocket();
  s.on("PEER_DISCONNECTED", handler);
  return () => { s.off("PEER_DISCONNECTED", handler); };
}

export function onPeerReconnected(
  handler: (payload: { clientId: string }) => void,
): () => void {
  const s = getSocket();
  s.on("PEER_RECONNECTED", handler);
  return () => { s.off("PEER_RECONNECTED", handler); };
}

export function onCriticalError(
  handler: (payload: { message: string; code: number }) => void,
): () => void {
  const s = getSocket();
  s.on("CRITICAL_ERROR", handler);
  return () => { s.off("CRITICAL_ERROR", handler); };
}
