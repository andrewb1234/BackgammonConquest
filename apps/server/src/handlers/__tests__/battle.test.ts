import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Server as SocketServer } from "socket.io";
import type { Socket } from "socket.io";
import type { SocketMessage, BattleState } from "@backgammon-conquest/shared";
import { createInitialBoard, INITIAL_VOID_SCRAP } from "@backgammon-conquest/shared";
import { handleIntentRoll, handleIntentMove } from "../battle.js";
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
    turnCount: 0,
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

// ---------------------------------------------------------
// TESTS
// ---------------------------------------------------------

beforeEach(() => {
  _resetForTesting();
});

describe("handleIntentRoll", () => {
  it("rejects when not in BATTLE phase", () => {
    const { hostId } = setupBattleSession();
    const gameState = getSessionByPlayerId(hostId)!;
    gameState.phase = "CAMPAIGN";

    const io = mockIo();
    const socket = mockSocket(hostId);
    handleIntentRoll(io, socket, makeMsg({ stateVersion: gameState.stateVersion }));

    expect(socket.emit).toHaveBeenCalledWith(
      "REJECT_INTENT",
      expect.objectContaining({ reason: "INVALID_PHASE" })
    );
  });

  it("rejects when not active player", () => {
    const { guestId } = setupBattleSession();
    const gameState = getSessionByPlayerId(guestId)!;

    const io = mockIo();
    const socket = mockSocket(guestId);
    handleIntentRoll(io, socket, makeMsg({ stateVersion: gameState.stateVersion }));

    expect(socket.emit).toHaveBeenCalledWith(
      "REJECT_INTENT",
      expect.objectContaining({ reason: "NOT_ACTIVE_PLAYER" })
    );
  });

  it("rejects when dice already rolled", () => {
    const { hostId } = setupBattleSession();
    const gameState = getSessionByPlayerId(hostId)!;
    gameState.battle!.dice = [3, 5];

    const io = mockIo();
    const socket = mockSocket(hostId);
    handleIntentRoll(io, socket, makeMsg({ stateVersion: gameState.stateVersion }));

    expect(socket.emit).toHaveBeenCalledWith(
      "REJECT_INTENT",
      expect.objectContaining({ reason: "INVALID_PHASE" })
    );
  });

  it("rolls dice and increments turn count", () => {
    const { hostId } = setupBattleSession();
    const gameState = getSessionByPlayerId(hostId)!;

    const io = mockIo();
    const socket = mockSocket(hostId);
    handleIntentRoll(io, socket, makeMsg({ stateVersion: gameState.stateVersion }));

    expect(gameState.battle!.dice).not.toBeNull();
    expect(gameState.battle!.dice!.length).toBeGreaterThanOrEqual(2);
    expect(gameState.battle!.turnCount).toBe(1);
    expect(gameState.battle!.diceUsed).toHaveLength(gameState.battle!.dice!.length);
  });

  it("rejects roll during LOADOUT sub-phase", () => {
    const { hostId } = setupBattleSession();
    const gameState = getSessionByPlayerId(hostId)!;
    gameState.battle!.subPhase = "LOADOUT";

    const io = mockIo();
    const socket = mockSocket(hostId);
    handleIntentRoll(io, socket, makeMsg({ stateVersion: gameState.stateVersion }));

    expect(socket.emit).toHaveBeenCalledWith(
      "REJECT_INTENT",
      expect.objectContaining({ reason: "INVALID_PHASE" })
    );
  });
});

describe("handleIntentMove", () => {
  it("rejects when no dice rolled", () => {
    const { hostId } = setupBattleSession();
    const gameState = getSessionByPlayerId(hostId)!;

    const io = mockIo();
    const socket = mockSocket(hostId);
    handleIntentMove(io, socket, makeMsg({ moves: [], stateVersion: gameState.stateVersion }));

    expect(socket.emit).toHaveBeenCalledWith(
      "REJECT_INTENT",
      expect.objectContaining({ reason: "INVALID_PHASE" })
    );
  });

  it("rejects when not active player", () => {
    const { guestId } = setupBattleSession();
    const gameState = getSessionByPlayerId(guestId)!;
    gameState.battle!.dice = [3, 5];
    gameState.battle!.diceUsed = [false, false];

    const io = mockIo();
    const socket = mockSocket(guestId);
    handleIntentMove(io, socket, makeMsg({ moves: [], stateVersion: gameState.stateVersion }));

    expect(socket.emit).toHaveBeenCalledWith(
      "REJECT_INTENT",
      expect.objectContaining({ reason: "NOT_ACTIVE_PLAYER" })
    );
  });
});
