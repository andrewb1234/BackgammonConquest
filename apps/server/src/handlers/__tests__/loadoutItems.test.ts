import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Server as SocketServer } from "socket.io";
import type { Socket } from "socket.io";
import type { SocketMessage, BattleState } from "@backgammon-conquest/shared";
import { INITIAL_VOID_SCRAP, createInitialBoard } from "@backgammon-conquest/shared";
import {
  handleReadyLoadout,
  handleIntentUseItem,
  handleIntentInvokeEscalation,
  handleIntentRespondEscalation,
} from "../loadoutItems.js";
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
// SETUP: create a game in BATTLE/LOADOUT phase
// ---------------------------------------------------------

function setupBattleSession() {
  const hostId = uniqueId("host");
  const guestId = uniqueId("guest");
  const { gameState, sectorCode } = createSession(hostId);
  const joinResult = joinSession(sectorCode, guestId);
  if (!joinResult.success) throw new Error(`Failed to join session: ${joinResult.reason}`);

  // Set factions
  gameState.players[0].faction = "IRON_HEGEMONY";
  gameState.players[1].faction = "SOLAR_COVENANT";

  // Transition to CAMPAIGN
  gameState.phase = "CAMPAIGN";
  gameState.campaign.activePlayerId = hostId;

  // Transition to BATTLE with LOADOUT sub-phase
  const board = createInitialBoard();
  const battle: BattleState = {
    contestedNodeId: 3,
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
    subPhase: "LOADOUT",
    loadoutReady: { HOST: false, GUEST: false },
    disabledModifierNodeId: null,
  };
  gameState.battle = battle;
  gameState.phase = "BATTLE";

  // Grant Void-Scrap
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

describe("handleReadyLoadout", () => {
  it("rejects when not in LOADOUT sub-phase", () => {
    const { hostId } = setupBattleSession();
    const gameState = getSessionByPlayerId(hostId)!;
    gameState.battle!.subPhase = "ACTIVE";

    const io = mockIo();
    const socket = mockSocket(hostId);
    handleReadyLoadout(io, socket, makeMsg({ selectedItems: [], stateVersion: gameState.stateVersion }));

    expect(socket.emit).toHaveBeenCalledWith(
      "REJECT_INTENT",
      expect.objectContaining({ reason: "INVALID_PHASE" })
    );
  });

  it("rejects when player cannot afford items", () => {
    const { hostId } = setupBattleSession();
    const gameState = getSessionByPlayerId(hostId)!;
    gameState.players[0].voidScrap = 0;

    const io = mockIo();
    const socket = mockSocket(hostId);
    handleReadyLoadout(io, socket, makeMsg({ selectedItems: ["AIR_STRIKE"], stateVersion: gameState.stateVersion }));

    expect(socket.emit).toHaveBeenCalledWith(
      "REJECT_INTENT",
      expect.objectContaining({ reason: "INSUFFICIENT_FUNDS" })
    );
  });

  it("accepts empty loadout and marks player ready", () => {
    const { hostId } = setupBattleSession();
    const gameState = getSessionByPlayerId(hostId)!;

    const io = mockIo();
    const socket = mockSocket(hostId);
    handleReadyLoadout(io, socket, makeMsg({ selectedItems: [], stateVersion: gameState.stateVersion }));

    expect(gameState.battle!.loadoutReady.HOST).toBe(true);
    expect(gameState.players[0].loadout).toEqual([]);
    expect(gameState.battle!.subPhase).toBe("LOADOUT"); // not both ready yet
  });

  it("transitions to ACTIVE when both players ready", () => {
    const { hostId, guestId } = setupBattleSession();
    const gameState = getSessionByPlayerId(hostId)!;

    const io = mockIo();
    const socketHost = mockSocket(hostId);
    const socketGuest = mockSocket(guestId);

    handleReadyLoadout(io, socketHost, makeMsg({ selectedItems: [], stateVersion: gameState.stateVersion }));
    // After first call, stateVersion incremented — use fresh version
    handleReadyLoadout(io, socketGuest, makeMsg({ selectedItems: [], stateVersion: gameState.stateVersion }));

    expect(gameState.battle!.subPhase).toBe("ACTIVE");
  });

  it("deducts Void-Scrap for purchased items", () => {
    const { hostId } = setupBattleSession();
    const gameState = getSessionByPlayerId(hostId)!;
    const initialScrap = gameState.players[0].voidScrap;

    const io = mockIo();
    const socket = mockSocket(hostId);
    handleReadyLoadout(io, socket, makeMsg({ selectedItems: ["AIR_STRIKE"], stateVersion: gameState.stateVersion }));

    expect(gameState.players[0].voidScrap).toBeLessThan(initialScrap);
    expect(gameState.players[0].loadout).toHaveLength(1);
    expect(gameState.players[0].loadout[0].itemId).toBe("AIR_STRIKE");
    expect(gameState.players[0].loadout[0].consumed).toBe(false);
  });
});

describe("handleIntentInvokeEscalation", () => {
  it("rejects when not controller", () => {
    const { hostId, guestId } = setupBattleSession();
    const gameState = getSessionByPlayerId(hostId)!;
    gameState.battle!.subPhase = "ACTIVE";
    gameState.battle!.escalation.controllerPlayerId = hostId;
    gameState.battle!.activePlayerId = hostId;

    const io = mockIo();
    const socket = mockSocket(guestId); // guest is not controller
    handleIntentInvokeEscalation(io, socket, makeMsg({ stateVersion: getSessionByPlayerId(guestId)!.stateVersion }));

    expect(socket.emit).toHaveBeenCalledWith(
      "REJECT_INTENT",
      expect.objectContaining({ reason: expect.any(String) })
    );
  });

  it("rejects when dice already rolled", () => {
    const { hostId } = setupBattleSession();
    const gameState = getSessionByPlayerId(hostId)!;
    gameState.battle!.subPhase = "ACTIVE";
    gameState.battle!.dice = [3, 5];

    const io = mockIo();
    const socket = mockSocket(hostId);
    handleIntentInvokeEscalation(io, socket, makeMsg({ stateVersion: gameState.stateVersion }));

    expect(socket.emit).toHaveBeenCalledWith(
      "REJECT_INTENT",
      expect.objectContaining({ reason: "ESCALATION_NOT_ALLOWED" })
    );
  });

  it("sets escalation status to OFFERED when valid", () => {
    const { hostId } = setupBattleSession();
    const gameState = getSessionByPlayerId(hostId)!;
    gameState.battle!.subPhase = "ACTIVE";

    const io = mockIo();
    const socket = mockSocket(hostId);
    handleIntentInvokeEscalation(io, socket, makeMsg({ stateVersion: gameState.stateVersion }));

    expect(gameState.battle!.escalation.status).toBe("OFFERED");
  });
});

describe("handleIntentRespondEscalation", () => {
  function setupEscalation() {
    const { hostId, guestId } = setupBattleSession();
    const gameState = getSessionByPlayerId(hostId)!;
    gameState.battle!.subPhase = "ACTIVE";
    gameState.battle!.escalation.status = "OFFERED";
    gameState.battle!.escalation.controllerPlayerId = hostId;
    return { gameState, hostId, guestId };
  }

  it("rejects when controller tries to respond", () => {
    const { hostId } = setupEscalation();
    const gameState = getSessionByPlayerId(hostId)!;

    const io = mockIo();
    const socket = mockSocket(hostId);
    handleIntentRespondEscalation(io, socket, makeMsg({ response: "ACCEPT", stateVersion: gameState.stateVersion }));

    expect(socket.emit).toHaveBeenCalledWith(
      "REJECT_INTENT",
      expect.objectContaining({ reason: "ESCALATION_NOT_ALLOWED" })
    );
  });

  it("ACCEPT doubles multiplier and transfers control", () => {
    const { guestId } = setupEscalation();
    const gameState = getSessionByPlayerId(guestId)!;

    const io = mockIo();
    const socket = mockSocket(guestId);
    handleIntentRespondEscalation(io, socket, makeMsg({ response: "ACCEPT", stateVersion: gameState.stateVersion }));

    expect(gameState.battle!.escalation.multiplier).toBe(2);
    expect(gameState.battle!.escalation.controllerPlayerId).toBe(guestId);
    expect(gameState.battle!.escalation.status).toBe("IDLE");
  });

  it("RETREAT gives invoker the node and transitions to RESOLUTION", () => {
    const { hostId, guestId } = setupEscalation();
    const gameState = getSessionByPlayerId(guestId)!;

    const io = mockIo();
    const socket = mockSocket(guestId);
    handleIntentRespondEscalation(io, socket, makeMsg({ response: "RETREAT", stateVersion: gameState.stateVersion }));

    expect(gameState.phase).toBe("RESOLUTION");
    const invokerRole = gameState.players.find((p) => p.playerId === hostId)?.role;
    expect(gameState.campaign.nodes[3].owner).toBe(invokerRole);
    expect(gameState.battle).toBeUndefined();
  });

  it("RETREAT on capital sets campaignWinner", () => {
    const { hostId, guestId } = setupEscalation();
    const gameState = getSessionByPlayerId(guestId)!;
    gameState.battle!.contestedNodeId = 6;

    const io = mockIo();
    const socket = mockSocket(guestId);
    handleIntentRespondEscalation(io, socket, makeMsg({ response: "RETREAT", stateVersion: gameState.stateVersion }));

    const invokerRole = gameState.players.find((p) => p.playerId === hostId)?.role;
    expect(gameState.campaignWinner).toBe(invokerRole);
  });
});

describe("handleIntentUseItem", () => {
  function setupActiveBattle() {
    const { hostId, guestId } = setupBattleSession();
    const gameState = getSessionByPlayerId(hostId)!;
    gameState.battle!.subPhase = "ACTIVE";
    return { gameState, hostId, guestId };
  }

  it("rejects LUCKY_CHANCE when no dice rolled", () => {
    const { hostId } = setupActiveBattle();
    const gameState = getSessionByPlayerId(hostId)!;
    gameState.players[0].loadout = [{ itemId: "LUCKY_CHANCE", consumed: false }];

    const io = mockIo();
    const socket = mockSocket(hostId);
    handleIntentUseItem(io, socket, makeMsg({ itemId: "LUCKY_CHANCE", stateVersion: gameState.stateVersion }));

    expect(socket.emit).toHaveBeenCalledWith(
      "REJECT_INTENT",
      expect.objectContaining({ reason: "INVALID_PHASE" })
    );
  });

  it("LUCKY_CHANCE re-rolls dice", () => {
    const { hostId } = setupActiveBattle();
    const gameState = getSessionByPlayerId(hostId)!;
    gameState.players[0].loadout = [{ itemId: "LUCKY_CHANCE", consumed: false }];
    gameState.battle!.dice = [1, 2];
    gameState.battle!.diceUsed = [false, false];

    const io = mockIo();
    const socket = mockSocket(hostId);
    handleIntentUseItem(io, socket, makeMsg({ itemId: "LUCKY_CHANCE", stateVersion: gameState.stateVersion }));

    expect(gameState.battle!.dice!.length).toBeGreaterThanOrEqual(2);
    expect(gameState.players[0].loadout[0].consumed).toBe(true);
  });

  it("AIR_STRIKE moves enemy blot to bar", () => {
    const { hostId } = setupActiveBattle();
    const gameState = getSessionByPlayerId(hostId)!;
    gameState.players[0].loadout = [{ itemId: "AIR_STRIKE", consumed: false }];

    gameState.battle!.board.points[5] = {
      owner: "GUEST",
      count: 1,
      activeEffects: [],
    };
    const barBefore = gameState.battle!.board.bars.GUEST;

    const io = mockIo();
    const socket = mockSocket(hostId);
    handleIntentUseItem(io, socket, makeMsg({ itemId: "AIR_STRIKE", targetId: 5, stateVersion: gameState.stateVersion }));

    expect(gameState.battle!.board.points[5].owner).toBeNull();
    expect(gameState.battle!.board.points[5].count).toBe(0);
    expect(gameState.battle!.board.bars.GUEST).toBe(barBefore + 1);
    expect(gameState.players[0].loadout[0].consumed).toBe(true);
  });

  it("ANGELIC_PROTECTION adds effect to friendly point", () => {
    const { hostId } = setupActiveBattle();
    const gameState = getSessionByPlayerId(hostId)!;
    gameState.players[0].loadout = [{ itemId: "ANGELIC_PROTECTION", consumed: false }];

    const io = mockIo();
    const socket = mockSocket(hostId);
    handleIntentUseItem(io, socket, makeMsg({ itemId: "ANGELIC_PROTECTION", targetId: 5, stateVersion: gameState.stateVersion }));

    expect(gameState.battle!.board.points[5].activeEffects).toHaveLength(1);
    expect(gameState.battle!.board.points[5].activeEffects[0].effectId).toBe("ANGELIC_PROTECTION");
    expect(gameState.players[0].loadout[0].consumed).toBe(true);
  });

  it("SABOTAGE rejects during ACTIVE sub-phase", () => {
    const { hostId } = setupActiveBattle();
    const gameState = getSessionByPlayerId(hostId)!;
    gameState.players[0].loadout = [{ itemId: "SABOTAGE", consumed: false }];

    const io = mockIo();
    const socket = mockSocket(hostId);
    handleIntentUseItem(io, socket, makeMsg({ itemId: "SABOTAGE", targetId: 6, stateVersion: gameState.stateVersion }));

    expect(socket.emit).toHaveBeenCalledWith(
      "REJECT_INTENT",
      expect.objectContaining({ reason: "INVALID_PHASE" })
    );
  });

  it("SABOTAGE works during LOADOUT sub-phase", () => {
    const { hostId } = setupBattleSession();
    const gameState = getSessionByPlayerId(hostId)!;
    gameState.players[0].loadout = [{ itemId: "SABOTAGE", consumed: false }];

    const io = mockIo();
    const socket = mockSocket(hostId);
    handleIntentUseItem(io, socket, makeMsg({ itemId: "SABOTAGE", targetId: 6, stateVersion: gameState.stateVersion }));

    expect(gameState.battle!.disabledModifierNodeId).toBe(6);
    expect(gameState.players[0].loadout[0].consumed).toBe(true);
  });
});
