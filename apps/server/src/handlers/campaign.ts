import type { Socket } from "socket.io";
import type { Server as SocketServer } from "socket.io";
import type {
  TargetNodePayload,
  SocketMessage,
  BattleState,
  EscalationState,
  PlayerRole,
} from "@backgammon-conquest/shared";
import { createInitialBoard, INITIAL_VOID_SCRAP } from "@backgammon-conquest/shared";
import { getSessionByPlayerId } from "../sessionManager.js";
import { broadcastStateUpdate, rejectIntent } from "../broadcast.js";

// ---------------------------------------------------------
// ADJACENCY MAP (linear 7-node map: 0-1-2-3-4-5-6)
// ---------------------------------------------------------

const ADJACENCY: Map<number, number[]> = new Map([
  [0, [1]],
  [1, [0, 2]],
  [2, [1, 3]],
  [3, [2, 4]],
  [4, [3, 5]],
  [5, [4, 6]],
  [6, [5]],
]);

function getPlayerRole(gameState: any, playerId: string): PlayerRole | null {
  const player = gameState.players.find((p: any) => p.playerId === playerId);
  return player?.role ?? null;
}

// ---------------------------------------------------------
// TARGET_NODE
// ---------------------------------------------------------

export function handleTargetNode(
  io: SocketServer,
  socket: Socket,
  msg: SocketMessage<TargetNodePayload>,
): void {
  const { clientId } = socket.data as { clientId?: string };
  const playerId = clientId ?? "";
  const gameState = getSessionByPlayerId(playerId);

  if (!gameState) {
    rejectIntent(socket, "TARGET_NODE", "INVALID_PHASE", 0);
    return;
  }

  if (gameState.phase !== "CAMPAIGN") {
    rejectIntent(socket, "TARGET_NODE", "INVALID_PHASE", gameState.stateVersion);
    return;
  }

  if (gameState.campaign.activePlayerId !== playerId) {
    rejectIntent(socket, "TARGET_NODE", "NOT_ACTIVE_PLAYER", gameState.stateVersion);
    return;
  }

  if (msg.payload.stateVersion < gameState.stateVersion) {
    rejectIntent(socket, "TARGET_NODE", "STALE_STATE", gameState.stateVersion);
    return;
  }

  const { nodeId } = msg.payload;

  // Validate node exists
  if (nodeId < 0 || nodeId >= 7) {
    rejectIntent(socket, "TARGET_NODE", "INVALID_TARGET", gameState.stateVersion);
    return;
  }

  const role = getPlayerRole(gameState, playerId);
  if (!role) {
    rejectIntent(socket, "TARGET_NODE", "NOT_ACTIVE_PLAYER", gameState.stateVersion);
    return;
  }

  // Can only target adjacent nodes not owned by the player
  const ownedNodes = gameState.campaign.nodes
    .filter((n: any) => n.owner === role)
    .map((n: any) => n.nodeId);

  const adjacentToOwned = ownedNodes.flatMap((id: number) => ADJACENCY.get(id) ?? []);
  if (!adjacentToOwned.includes(nodeId)) {
    rejectIntent(socket, "TARGET_NODE", "INVALID_TARGET", gameState.stateVersion);
    return;
  }

  const targetNode = gameState.campaign.nodes[nodeId];
  if (targetNode.owner === role) {
    rejectIntent(socket, "TARGET_NODE", "INVALID_TARGET", gameState.stateVersion);
    return;
  }

  // Initialize battle
  const board = createInitialBoard();
  const battle: BattleState = {
    contestedNodeId: nodeId,
    turnCount: 0,
    board,
    activePlayerId: playerId, // Attacker goes first (initiative)
    dice: null,
    diceUsed: [],
    escalation: {
      status: "IDLE",
      multiplier: 1,
      controllerPlayerId: playerId, // Attacker is initial escalation controller
    } as EscalationState,
    subPhase: "LOADOUT",
    loadoutReady: { HOST: false, GUEST: false },
    disabledModifierNodeId: null,
  };

  // Grant initial Void-Scrap for loadout purchasing
  for (const player of gameState.players) {
    player.voidScrap = INITIAL_VOID_SCRAP;
    player.loadout = [];
    player.activeEffects = [];
  }

  gameState.battle = battle;
  gameState.phase = "BATTLE";
  gameState.stateVersion++;

  broadcastStateUpdate(io, gameState, ["phase", "battle", "players"]);
}
