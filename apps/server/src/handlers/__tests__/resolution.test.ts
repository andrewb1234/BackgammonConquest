import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Server as SocketServer } from "socket.io";
import type { Socket } from "socket.io";
import type { SocketMessage, BattleState } from "@backgammon-conquest/shared";
import { createInitialBoard, INITIAL_VOID_SCRAP, WIN_REWARD, LOSS_REWARD } from "@backgammon-conquest/shared";
import { handleAcknowledgeResult, handleIntentForfeit, applyForfeit } from "../resolution.js";
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

function setupBattleSession() {
  const hostId = uniqueId("host");
  const guestId = uniqueId("guest");
  const { gameState, sectorCode } = createSession(hostId);
  const joinResult = joinSession(sectorCode, guestId);
  if (!joinResult.success) throw new Error(`Failed to join: ${joinResult.reason}`);

  gameState.players[0].faction = "IRON_HEGEMONY";
  gameState.players[1].faction = "SOLAR_COVENANT";
  gameState.phase = "CAMPAIGN";
  gameState.campaign.activePlayerId = hostId;

  const board = createInitialBoard();
  const battle: BattleState = {
    contestedNodeId: 1,
    turnCount: 1,
    board,
    activePlayerId: hostId,
    dice: null,
    diceUsed: [],
    escalation: {
      status: "IDLE",
      multiplier: 1,
      controllerPlayerId: hostId,
    },
    subPhase: "ACTIVE",
    loadoutReady: { HOST: true, GUEST: true },
    disabledModifierNodeId: null,
  };
  gameState.battle = battle;
  gameState.phase = "BATTLE";

  for (const player of gameState.players) {
    player.voidScrap = INITIAL_VOID_SCRAP;
    player.loadout = [];
    player.activeEffects = [];
  }

  return { gameState, hostId, guestId };
}

function setupResolutionSession() {
  const { gameState, hostId, guestId } = setupBattleSession();
  // Simulate a battle win by HOST (borne off 15)
  gameState.battle!.board.borneOff.HOST = 15;
  gameState.phase = "RESOLUTION";
  return { gameState, hostId, guestId };
}

// ---------------------------------------------------------
// TESTS
// ---------------------------------------------------------

beforeEach(() => {
  _resetForTesting();
});

describe("applyForfeit", () => {
  it("transitions to RESOLUTION and sets campaignWinner to opponent", () => {
    const { gameState } = setupBattleSession();
    const deltas = applyForfeit(gameState, "GUEST");

    expect(gameState.phase).toBe("RESOLUTION");
    expect(gameState.campaignWinner).toBe("HOST");
    expect(gameState.battle).toBeUndefined();
    expect(deltas).toContain("campaignWinner");
  });

  it("gives contested node to winner", () => {
    const { gameState } = setupBattleSession();
    applyForfeit(gameState, "GUEST");

    expect(gameState.campaign.nodes[1].owner).toBe("HOST");
  });

  it("applies Void-Scrap rewards", () => {
    const { gameState } = setupBattleSession();
    const hostScrapBefore = gameState.players[0].voidScrap;
    const guestScrapBefore = gameState.players[1].voidScrap;

    applyForfeit(gameState, "GUEST");

    // HOST wins, gets WIN_REWARD * multiplier
    expect(gameState.players[0].voidScrap).toBe(hostScrapBefore + WIN_REWARD);
    // GUEST loses, gets LOSS_REWARD
    expect(gameState.players[1].voidScrap).toBe(guestScrapBefore + LOSS_REWARD);
  });

  it("applies multiplier from escalation", () => {
    const { gameState } = setupBattleSession();
    gameState.battle!.escalation.multiplier = 2;
    const hostScrapBefore = gameState.players[0].voidScrap;

    applyForfeit(gameState, "GUEST");

    expect(gameState.players[0].voidScrap).toBe(hostScrapBefore + WIN_REWARD * 2);
  });

  it("detects capital capture on forfeit", () => {
    const { gameState } = setupBattleSession();
    // Make contested node = HOST capital (node 0)
    gameState.battle!.contestedNodeId = 0;
    // GUEST forfeits, but node 0 is HOST's capital, so this is GUEST attacking HOST capital
    // Actually: if GUEST forfeits, HOST wins. Node 0 is HOST's own capital.
    // Let's test: HOST forfeits while contesting GUEST capital (node 6)
    gameState.battle!.contestedNodeId = 6;

    applyForfeit(gameState, "HOST");

    // GUEST wins because HOST forfeited, and node 6 is GUEST capital
    expect(gameState.campaignWinner).toBe("GUEST");
  });
});

describe("handleIntentForfeit", () => {
  it("rejects when not in BATTLE or CAMPAIGN phase", () => {
    const { hostId } = setupBattleSession();
    const gameState = getSessionByPlayerId(hostId)!;
    gameState.phase = "LOBBY";

    const io = mockIo();
    const socket = mockSocket(hostId);
    handleIntentForfeit(io, socket, makeMsg({ stateVersion: gameState.stateVersion }));

    expect(socket.emit).toHaveBeenCalledWith(
      "REJECT_INTENT",
      expect.objectContaining({ reason: "INVALID_PHASE" })
    );
  });

  it("applies forfeit and broadcasts state", () => {
    const { hostId } = setupBattleSession();
    const gameState = getSessionByPlayerId(hostId)!;

    const io = mockIo();
    const socket = mockSocket(hostId);
    handleIntentForfeit(io, socket, makeMsg({ stateVersion: gameState.stateVersion }));

    expect(gameState.phase).toBe("RESOLUTION");
    expect(gameState.campaignWinner).toBe("GUEST"); // HOST forfeited
    expect(gameState.battle).toBeUndefined();
    expect(io.to).toHaveBeenCalled();
  });
});

describe("handleAcknowledgeResult", () => {
  it("rejects when not in RESOLUTION phase", () => {
    const { hostId } = setupBattleSession();
    const gameState = getSessionByPlayerId(hostId)!;

    const io = mockIo();
    const socket = mockSocket(hostId);
    handleAcknowledgeResult(io, socket, makeMsg({ stateVersion: gameState.stateVersion }));

    expect(socket.emit).toHaveBeenCalledWith(
      "REJECT_INTENT",
      expect.objectContaining({ reason: "INVALID_PHASE" })
    );
  });

  it("waits for both players to acknowledge before resolving", () => {
    const { hostId, guestId } = setupResolutionSession();
    const gameState = getSessionByPlayerId(hostId)!;

    const io = mockIo();
    const socketHost = mockSocket(hostId);
    handleAcknowledgeResult(io, socketHost, makeMsg({ stateVersion: gameState.stateVersion }));

    // Only one player acknowledged — should still be RESOLUTION
    expect(gameState.phase).toBe("RESOLUTION");

    const socketGuest = mockSocket(guestId);
    handleAcknowledgeResult(io, socketGuest, makeMsg({ stateVersion: gameState.stateVersion }));

    // Both acknowledged — should transition to CAMPAIGN
    expect(gameState.phase).toBe("CAMPAIGN");
    expect(gameState.battle).toBeUndefined();
    expect(gameState.campaign.nodes[1].owner).toBe("HOST"); // winner
  });

  it("applies Void-Scrap rewards on acknowledgment", () => {
    const { hostId, guestId } = setupResolutionSession();
    const gameState = getSessionByPlayerId(hostId)!;
    const hostScrapBefore = gameState.players[0].voidScrap;
    const guestScrapBefore = gameState.players[1].voidScrap;

    const io = mockIo();
    const socketHost = mockSocket(hostId);
    const socketGuest = mockSocket(guestId);
    handleAcknowledgeResult(io, socketHost, makeMsg({ stateVersion: gameState.stateVersion }));
    handleAcknowledgeResult(io, socketGuest, makeMsg({ stateVersion: gameState.stateVersion }));

    // HOST won (borneOff 15), gets WIN_REWARD
    expect(gameState.players[0].voidScrap).toBe(hostScrapBefore + WIN_REWARD);
    // GUEST lost, gets LOSS_REWARD
    expect(gameState.players[1].voidScrap).toBe(guestScrapBefore + LOSS_REWARD);
  });

  it("detects capital capture on acknowledgment", () => {
    const { hostId, guestId } = setupResolutionSession();
    const gameState = getSessionByPlayerId(hostId)!;
    // Make contested node = GUEST capital (node 6)
    gameState.battle!.contestedNodeId = 6;

    const io = mockIo();
    const socketHost = mockSocket(hostId);
    const socketGuest = mockSocket(guestId);
    handleAcknowledgeResult(io, socketHost, makeMsg({ stateVersion: gameState.stateVersion }));
    handleAcknowledgeResult(io, socketGuest, makeMsg({ stateVersion: gameState.stateVersion }));

    // HOST captured GUEST capital — campaign win
    expect(gameState.campaignWinner).toBe("HOST");
    expect(gameState.phase).toBe("RESOLUTION");
  });
});
