import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Server as SocketServer } from "socket.io";
import type { Socket } from "socket.io";
import type { SocketMessage } from "@backgammon-conquest/shared";
import { handleTargetNode } from "../campaign.js";
import {
  createSession,
  joinSession,
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

function mockSocket(clientId: string): Socket {
  return {
    data: { clientId },
    emit: vi.fn(),
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
// SETUP
// ---------------------------------------------------------

function setupCampaignSession() {
  const hostId = uniqueId("host");
  const guestId = uniqueId("guest");
  const { gameState, sectorCode } = createSession(hostId);
  const joinResult = joinSession(sectorCode, guestId);
  if (!joinResult.success) throw new Error(`Failed to join: ${joinResult.reason}`);

  gameState.players[0].faction = "IRON_HEGEMONY";
  gameState.players[1].faction = "SOLAR_COVENANT";
  gameState.phase = "CAMPAIGN";
  gameState.campaign.activePlayerId = hostId;

  return { gameState, hostId, guestId };
}

// ---------------------------------------------------------
// TESTS
// ---------------------------------------------------------

beforeEach(() => {
  _resetForTesting();
});

describe("handleTargetNode", () => {
  it("rejects when not in CAMPAIGN phase", () => {
    const { hostId } = setupCampaignSession();
    const gameState = getSessionByPlayerId(hostId)!;
    gameState.phase = "BATTLE";

    const io = mockIo();
    const socket = mockSocket(hostId);
    handleTargetNode(io, socket, makeMsg({ nodeId: 1, stateVersion: gameState.stateVersion }));

    expect(socket.emit).toHaveBeenCalledWith(
      "REJECT_INTENT",
      expect.objectContaining({ reason: "INVALID_PHASE" })
    );
  });

  it("rejects when not active player", () => {
    const { guestId } = setupCampaignSession();
    const gameState = getSessionByPlayerId(guestId)!;

    const io = mockIo();
    const socket = mockSocket(guestId);
    handleTargetNode(io, socket, makeMsg({ nodeId: 1, stateVersion: gameState.stateVersion }));

    expect(socket.emit).toHaveBeenCalledWith(
      "REJECT_INTENT",
      expect.objectContaining({ reason: "NOT_ACTIVE_PLAYER" })
    );
  });

  it("rejects non-adjacent node", () => {
    const { hostId } = setupCampaignSession();
    const gameState = getSessionByPlayerId(hostId)!;
    // HOST owns node 0, can only target node 1

    const io = mockIo();
    const socket = mockSocket(hostId);
    handleTargetNode(io, socket, makeMsg({ nodeId: 5, stateVersion: gameState.stateVersion }));

    expect(socket.emit).toHaveBeenCalledWith(
      "REJECT_INTENT",
      expect.objectContaining({ reason: "INVALID_TARGET" })
    );
  });

  it("rejects own node", () => {
    const { hostId } = setupCampaignSession();
    const gameState = getSessionByPlayerId(hostId)!;
    // HOST owns node 0

    const io = mockIo();
    const socket = mockSocket(hostId);
    handleTargetNode(io, socket, makeMsg({ nodeId: 0, stateVersion: gameState.stateVersion }));

    expect(socket.emit).toHaveBeenCalledWith(
      "REJECT_INTENT",
      expect.objectContaining({ reason: "INVALID_TARGET" })
    );
  });

  it("accepts adjacent enemy node and transitions to BATTLE", () => {
    const { hostId } = setupCampaignSession();
    const gameState = getSessionByPlayerId(hostId)!;

    const io = mockIo();
    const socket = mockSocket(hostId);
    handleTargetNode(io, socket, makeMsg({ nodeId: 1, stateVersion: gameState.stateVersion }));

    expect(gameState.phase).toBe("BATTLE");
    expect(gameState.battle).toBeDefined();
    expect(gameState.battle!.contestedNodeId).toBe(1);
    expect(gameState.battle!.subPhase).toBe("LOADOUT");
    expect(gameState.battle!.activePlayerId).toBe(hostId);
    expect(gameState.battle!.escalation.controllerPlayerId).toBe(hostId);
  });

  it("grants initial Void-Scrap on battle init", () => {
    const { hostId } = setupCampaignSession();
    const gameState = getSessionByPlayerId(hostId)!;

    const io = mockIo();
    const socket = mockSocket(hostId);
    handleTargetNode(io, socket, makeMsg({ nodeId: 1, stateVersion: gameState.stateVersion }));

    expect(gameState.players[0].voidScrap).toBeGreaterThan(0);
    expect(gameState.players[1].voidScrap).toBeGreaterThan(0);
  });
});
