import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Server as SocketServer } from "socket.io";
import type { Socket } from "socket.io";
import type { SocketMessage } from "@backgammon-conquest/shared";
import { handleCreateSession, handleJoinSession, handleRejoinSession } from "../session.js";
import {
  createSession,
  getSessionByPlayerId,
  _resetForTesting,
} from "../../sessionManager.js";

// ---------------------------------------------------------
// MOCK FACTORIES
// ---------------------------------------------------------

let testCounter = 0;
function uniqueId(prefix: string) {
  return `${prefix}-${++testCounter}`;
}

function mockSocket(clientId: string) {
  return {
    data: { clientId },
    emit: vi.fn(),
    join: vi.fn(),
  } as unknown as Socket;
}

function mockIo(): SocketServer {
  return {
    to: vi.fn().mockReturnValue({ emit: vi.fn() }),
  } as unknown as SocketServer;
}

function makeMsg<T>(payload: T): SocketMessage<T> {
  return { type: "TEST", eventId: "test", payload, timestamp: Date.now() };
}

// ---------------------------------------------------------
// TESTS
// ---------------------------------------------------------

beforeEach(() => {
  _resetForTesting();
});

describe("handleCreateSession", () => {
  it("creates a session and emits SESSION_CREATED", () => {
    const hostId = uniqueId("host");
    const io = mockIo();
    const socket = mockSocket(hostId);

    handleCreateSession(io, socket, makeMsg({ clientId: hostId }));

    expect(socket.emit).toHaveBeenCalledWith(
      "SESSION_CREATED",
      expect.objectContaining({
        sessionId: expect.any(String),
        sectorCode: expect.any(String),
      })
    );

    const gameState = getSessionByPlayerId(hostId);
    expect(gameState).not.toBeNull();
    expect(gameState!.players[0].playerId).toBe(hostId);
  });

  it("rejects if player already in a session", () => {
    const hostId = uniqueId("host");
    const io = mockIo();
    const socket = mockSocket(hostId);

    handleCreateSession(io, socket, makeMsg({ clientId: hostId }));

    const socket2 = mockSocket(hostId);
    handleCreateSession(io, socket2, makeMsg({ clientId: hostId }));

    expect(socket2.emit).toHaveBeenCalledWith(
      "REJECT_INTENT",
      expect.objectContaining({ reason: "INVALID_PHASE" })
    );
  });

  it("joins socket to room", () => {
    const hostId = uniqueId("host");
    const io = mockIo();
    const socket = mockSocket(hostId);

    handleCreateSession(io, socket, makeMsg({ clientId: hostId }));

    expect(socket.join).toHaveBeenCalled();
  });
});

describe("handleJoinSession", () => {
  it("joins an existing session with valid sector code", () => {
    const hostId = uniqueId("host");
    const guestId = uniqueId("guest");
    const io = mockIo();

    // Create session directly via sessionManager
    const { sectorCode } = createSession(hostId);

    const guestSocket = mockSocket(guestId);
    handleJoinSession(io, guestSocket, makeMsg({ clientId: guestId, sectorCode }));

    expect(guestSocket.emit).toHaveBeenCalledWith(
      "SESSION_JOINED",
      expect.objectContaining({ sessionId: expect.any(String) })
    );

    const updated = getSessionByPlayerId(guestId);
    expect(updated).not.toBeNull();
    expect(updated!.players[1].playerId).toBe(guestId);
  });

  it("rejects with invalid sector code", () => {
    const guestId = uniqueId("guest");
    const io = mockIo();
    const socket = mockSocket(guestId);

    handleJoinSession(io, socket, makeMsg({ clientId: guestId, sectorCode: "INVALID" }));

    expect(socket.emit).toHaveBeenCalledWith(
      "REJECT_INTENT",
      expect.objectContaining({ reason: "INVALID_TARGET" })
    );
  });

  it("rejects when session is full", () => {
    const hostId = uniqueId("host");
    const guestId1 = uniqueId("guest1");
    const guestId2 = uniqueId("guest2");
    const io = mockIo();

    const { sectorCode } = createSession(hostId);

    // Fill the guest slot
    const guest1Socket = mockSocket(guestId1);
    handleJoinSession(io, guest1Socket, makeMsg({ clientId: guestId1, sectorCode }));

    // Try to join as third player
    const guest2Socket = mockSocket(guestId2);
    handleJoinSession(io, guest2Socket, makeMsg({ clientId: guestId2, sectorCode }));

    expect(guest2Socket.emit).toHaveBeenCalledWith(
      "REJECT_INTENT",
      expect.objectContaining({ reason: "INVALID_PHASE" })
    );
  });
});

describe("handleRejoinSession", () => {
  it("rejects with invalid session ID", () => {
    const clientId = uniqueId("player");
    const io = mockIo();
    const socket = mockSocket(clientId);

    handleRejoinSession(io, socket, makeMsg({ clientId, sessionId: "nonexistent" }));

    expect(socket.emit).toHaveBeenCalledWith(
      "REJECT_INTENT",
      expect.objectContaining({ reason: "INVALID_TARGET" })
    );
  });

  it("rejoins a valid session and marks player connected", () => {
    const hostId = uniqueId("host");
    const guestId = uniqueId("guest");
    const io = mockIo();

    const { sectorCode, sessionId, gameState } = createSession(hostId);

    // Join guest
    const guestSocket = mockSocket(guestId);
    handleJoinSession(io, guestSocket, makeMsg({ clientId: guestId, sectorCode }));

    // Simulate disconnect
    gameState.players[1].connected = false;

    // Rejoin
    const rejoinSocket = mockSocket(guestId);
    handleRejoinSession(io, rejoinSocket, makeMsg({ clientId: guestId, sessionId }));

    expect(gameState.players[1].connected).toBe(true);
    expect(rejoinSocket.join).toHaveBeenCalled();
  });
});
