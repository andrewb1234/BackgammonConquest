import type { Socket } from "socket.io";
import type { Server as SocketServer } from "socket.io";
import type {
  ReadyLoadoutPayload,
  IntentUseItemPayload,
  IntentInvokeEscalationPayload,
  IntentRespondEscalationPayload,
  SocketMessage,
  PlayerRole,
  ItemId,
} from "@backgammon-conquest/shared";
import {
  ITEM_CATALOG,
  MAX_LOADOUT_SLOTS,
  MAW_EXTRA_SLOT,
} from "@backgammon-conquest/shared";
import { getSessionByPlayerId } from "../sessionManager.js";
import { broadcastStateUpdate, rejectIntent } from "../broadcast.js";

// ---------------------------------------------------------
// HELPERS
// ---------------------------------------------------------

function getPlayerRole(gameState: any, playerId: string): PlayerRole | null {
  const player = gameState.players.find((p: any) => p.playerId === playerId);
  return player?.role ?? null;
}

function getPlayer(gameState: any, playerId: string) {
  return gameState.players.find((p: any) => p.playerId === playerId);
}

function getMaxSlots(gameState: any, role: PlayerRole): number {
  // The Maw (node 4) grants 3 slots to its owner
  const mawNode = gameState.campaign.nodes[4];
  if (mawNode && mawNode.owner === role && gameState.battle?.disabledModifierNodeId !== 4) {
    return MAW_EXTRA_SLOT;
  }
  return MAX_LOADOUT_SLOTS;
}

// ---------------------------------------------------------
// READY_LOADOUT
// ---------------------------------------------------------

export function handleReadyLoadout(
  io: SocketServer,
  socket: Socket,
  msg: SocketMessage<ReadyLoadoutPayload>,
): void {
  const { clientId } = socket.data as { clientId?: string };
  const playerId = clientId ?? "";
  const gameState = getSessionByPlayerId(playerId);

  if (!gameState) {
    rejectIntent(socket, "READY_LOADOUT", "INVALID_PHASE", 0);
    return;
  }

  if (gameState.phase !== "BATTLE" || !gameState.battle) {
    rejectIntent(socket, "READY_LOADOUT", "INVALID_PHASE", gameState.stateVersion);
    return;
  }

  if (gameState.battle.subPhase !== "LOADOUT") {
    rejectIntent(socket, "READY_LOADOUT", "INVALID_PHASE", gameState.stateVersion);
    return;
  }

  if (msg.payload.stateVersion < gameState.stateVersion) {
    rejectIntent(socket, "READY_LOADOUT", "STALE_STATE", gameState.stateVersion);
    return;
  }

  const role = getPlayerRole(gameState, playerId);
  if (!role) {
    rejectIntent(socket, "READY_LOADOUT", "NOT_ACTIVE_PLAYER", gameState.stateVersion);
    return;
  }

  const player = getPlayer(gameState, playerId);
  const maxSlots = getMaxSlots(gameState, role);
  const { selectedItems } = msg.payload;

  // Validate item count
  if (selectedItems.length > maxSlots) {
    rejectIntent(socket, "READY_LOADOUT", "INVALID_MOVE", gameState.stateVersion);
    return;
  }

  // Validate each item exists and player can afford
  let totalCost = 0;
  for (const itemId of selectedItems) {
    const def = ITEM_CATALOG.find((i) => i.itemId === itemId);
    if (!def) {
      rejectIntent(socket, "READY_LOADOUT", "INVALID_MOVE", gameState.stateVersion);
      return;
    }
    totalCost += def.cost;
  }

  if (totalCost > player.voidScrap) {
    rejectIntent(socket, "READY_LOADOUT", "INSUFFICIENT_FUNDS", gameState.stateVersion);
    return;
  }

  // Deduct cost and set loadout
  player.voidScrap -= totalCost;
  player.loadout = selectedItems.map((id: string) => ({ itemId: id as ItemId, consumed: false }));
  gameState.battle.loadoutReady[role] = true;
  gameState.stateVersion++;

  const deltas = ["players", "battle.loadoutReady"];

  // Check if both players are ready
  if (gameState.battle.loadoutReady.HOST && gameState.battle.loadoutReady.GUEST) {
    // Transition to active battle
    gameState.battle.subPhase = "ACTIVE";
    deltas.push("battle.subPhase");
  }

  broadcastStateUpdate(io, gameState, deltas);
}

// ---------------------------------------------------------
// INTENT_USE_ITEM
// ---------------------------------------------------------

export function handleIntentUseItem(
  io: SocketServer,
  socket: Socket,
  msg: SocketMessage<IntentUseItemPayload>,
): void {
  const { clientId } = socket.data as { clientId?: string };
  const playerId = clientId ?? "";
  const gameState = getSessionByPlayerId(playerId);

  if (!gameState) {
    rejectIntent(socket, "INTENT_USE_ITEM", "INVALID_PHASE", 0);
    return;
  }

  if (gameState.phase !== "BATTLE" || !gameState.battle) {
    rejectIntent(socket, "INTENT_USE_ITEM", "INVALID_PHASE", gameState.stateVersion);
    return;
  }

  if (gameState.battle.subPhase !== "ACTIVE") {
    rejectIntent(socket, "INTENT_USE_ITEM", "INVALID_PHASE", gameState.stateVersion);
    return;
  }

  if (msg.payload.stateVersion < gameState.stateVersion) {
    rejectIntent(socket, "INTENT_USE_ITEM", "STALE_STATE", gameState.stateVersion);
    return;
  }

  const role = getPlayerRole(gameState, playerId);
  if (!role) {
    rejectIntent(socket, "INTENT_USE_ITEM", "NOT_ACTIVE_PLAYER", gameState.stateVersion);
    return;
  }

  const player = getPlayer(gameState, playerId);
  const { itemId, targetId } = msg.payload;

  // Find item in loadout
  const item = player.loadout.find((i: any) => i.itemId === itemId && !i.consumed);
  if (!item) {
    rejectIntent(socket, "INTENT_USE_ITEM", "INVALID_MOVE", gameState.stateVersion);
    return;
  }

  const def = ITEM_CATALOG.find((i) => i.itemId === itemId);
  if (!def) {
    rejectIntent(socket, "INTENT_USE_ITEM", "INVALID_MOVE", gameState.stateVersion);
    return;
  }

  const battle = gameState.battle;
  const deltas: string[] = [];

  switch (itemId) {
    case "AIR_STRIKE": {
      // Pre-Move: move one enemy blot to bar
      // targetId = point index (0-23) of the enemy blot
      if (targetId === undefined || typeof targetId !== "number") {
        rejectIntent(socket, "INTENT_USE_ITEM", "INVALID_TARGET", gameState.stateVersion);
        return;
      }
      const pointIdx = targetId as number;
      if (pointIdx < 0 || pointIdx >= 24) {
        rejectIntent(socket, "INTENT_USE_ITEM", "INVALID_TARGET", gameState.stateVersion);
        return;
      }
      const point = battle.board.points[pointIdx];
      const enemyRole: PlayerRole = role === "HOST" ? "GUEST" : "HOST";
      if (point.owner !== enemyRole || point.count !== 1) {
        rejectIntent(socket, "INTENT_USE_ITEM", "INVALID_TARGET", gameState.stateVersion);
        return;
      }
      // Move the blot to bar
      point.owner = null;
      point.count = 0;
      battle.board.bars[enemyRole]++;
      deltas.push("battle.board.points", "battle.board.bars");
      break;
    }

    case "ANGELIC_PROTECTION": {
      // Pre-Move: make one friendly piece invulnerable for 2 turns
      // targetId = point index of the friendly piece
      if (targetId === undefined || typeof targetId !== "number") {
        rejectIntent(socket, "INTENT_USE_ITEM", "INVALID_TARGET", gameState.stateVersion);
        return;
      }
      const ptIdx = targetId as number;
      if (ptIdx < 0 || ptIdx >= 24) {
        rejectIntent(socket, "INTENT_USE_ITEM", "INVALID_TARGET", gameState.stateVersion);
        return;
      }
      const pt = battle.board.points[ptIdx];
      if (pt.owner !== role || pt.count < 1) {
        rejectIntent(socket, "INTENT_USE_ITEM", "INVALID_TARGET", gameState.stateVersion);
        return;
      }
      pt.activeEffects.push({
        effectId: "ANGELIC_PROTECTION",
        duration: 2,
        expiresOnTurn: battle.turnCount + 2,
        sourcePlayerId: playerId,
      });
      deltas.push("battle.board.points");
      break;
    }

    case "LUCKY_CHANCE": {
      // Post-Roll: force a re-roll of active dice
      if (!battle.dice) {
        rejectIntent(socket, "INTENT_USE_ITEM", "INVALID_PHASE", gameState.stateVersion);
        return;
      }
      const die1 = Math.floor(Math.random() * 6) + 1;
      const die2 = Math.floor(Math.random() * 6) + 1;
      const isDoubles = die1 === die2;
      battle.dice = isDoubles ? [die1, die1, die1, die1] : [die1, die2];
      battle.diceUsed = new Array(battle.dice.length).fill(false);
      deltas.push("battle.dice", "battle.diceUsed");
      break;
    }

    case "SABOTAGE": {
      // Pre-Match: disable an enemy node's passive modifier
      // targetId = nodeId of the enemy node
      // This should only be usable during LOADOUT sub-phase, but we allow it
      // during ACTIVE for flexibility (it's a one-time use)
      if (targetId === undefined || typeof targetId !== "number") {
        rejectIntent(socket, "INTENT_USE_ITEM", "INVALID_TARGET", gameState.stateVersion);
        return;
      }
      const nodeId = targetId as number;
      if (nodeId < 0 || nodeId >= 7) {
        rejectIntent(socket, "INTENT_USE_ITEM", "INVALID_TARGET", gameState.stateVersion);
        return;
      }
      const node = gameState.campaign.nodes[nodeId];
      const enemyRole: PlayerRole = role === "HOST" ? "GUEST" : "HOST";
      if (node.owner !== enemyRole) {
        rejectIntent(socket, "INTENT_USE_ITEM", "INVALID_TARGET", gameState.stateVersion);
        return;
      }
      battle.disabledModifierNodeId = nodeId;
      deltas.push("battle.disabledModifierNodeId");
      break;
    }

    default:
      rejectIntent(socket, "INTENT_USE_ITEM", "INVALID_MOVE", gameState.stateVersion);
      return;
  }

  // Mark item consumed
  item.consumed = true;
  gameState.stateVersion++;
  deltas.push("players");

  broadcastStateUpdate(io, gameState, deltas);
}

// ---------------------------------------------------------
// INTENT_INVOKE_ESCALATION
// ---------------------------------------------------------

export function handleIntentInvokeEscalation(
  io: SocketServer,
  socket: Socket,
  msg: SocketMessage<IntentInvokeEscalationPayload>,
): void {
  const { clientId } = socket.data as { clientId?: string };
  const playerId = clientId ?? "";
  const gameState = getSessionByPlayerId(playerId);

  if (!gameState) {
    rejectIntent(socket, "INTENT_INVOKE_ESCALATION", "INVALID_PHASE", 0);
    return;
  }

  if (gameState.phase !== "BATTLE" || !gameState.battle) {
    rejectIntent(socket, "INTENT_INVOKE_ESCALATION", "INVALID_PHASE", gameState.stateVersion);
    return;
  }

  if (gameState.battle.subPhase !== "ACTIVE") {
    rejectIntent(socket, "INTENT_INVOKE_ESCALATION", "INVALID_PHASE", gameState.stateVersion);
    return;
  }

  if (msg.payload.stateVersion < gameState.stateVersion) {
    rejectIntent(socket, "INTENT_INVOKE_ESCALATION", "STALE_STATE", gameState.stateVersion);
    return;
  }

  const battle = gameState.battle;

  // Only controller can invoke
  if (battle.escalation.controllerPlayerId !== playerId) {
    rejectIntent(socket, "INTENT_INVOKE_ESCALATION", "ESCALATION_NOT_ALLOWED", gameState.stateVersion);
    return;
  }

  // Must be IDLE to invoke
  if (battle.escalation.status !== "IDLE") {
    rejectIntent(socket, "INTENT_INVOKE_ESCALATION", "ESCALATION_NOT_ALLOWED", gameState.stateVersion);
    return;
  }

  // Must be before rolling (dice must be null)
  if (battle.dice !== null) {
    rejectIntent(socket, "INTENT_INVOKE_ESCALATION", "ESCALATION_NOT_ALLOWED", gameState.stateVersion);
    return;
  }

  // Must be active player's turn
  if (battle.activePlayerId !== playerId) {
    rejectIntent(socket, "INTENT_INVOKE_ESCALATION", "NOT_ACTIVE_PLAYER", gameState.stateVersion);
    return;
  }

  battle.escalation.status = "OFFERED";
  gameState.stateVersion++;

  broadcastStateUpdate(io, gameState, ["battle.escalation"]);
}

// ---------------------------------------------------------
// INTENT_RESPOND_ESCALATION
// ---------------------------------------------------------

export function handleIntentRespondEscalation(
  io: SocketServer,
  socket: Socket,
  msg: SocketMessage<IntentRespondEscalationPayload>,
): void {
  const { clientId } = socket.data as { clientId?: string };
  const playerId = clientId ?? "";
  const gameState = getSessionByPlayerId(playerId);

  if (!gameState) {
    rejectIntent(socket, "INTENT_RESPOND_ESCALATION", "INVALID_PHASE", 0);
    return;
  }

  if (gameState.phase !== "BATTLE" || !gameState.battle) {
    rejectIntent(socket, "INTENT_RESPOND_ESCALATION", "INVALID_PHASE", gameState.stateVersion);
    return;
  }

  if (msg.payload.stateVersion < gameState.stateVersion) {
    rejectIntent(socket, "INTENT_RESPOND_ESCALATION", "STALE_STATE", gameState.stateVersion);
    return;
  }

  const battle = gameState.battle;

  if (battle.escalation.status !== "OFFERED") {
    rejectIntent(socket, "INTENT_RESPOND_ESCALATION", "ESCALATION_NOT_ALLOWED", gameState.stateVersion);
    return;
  }

  // Only the non-controller (opponent) can respond
  if (battle.escalation.controllerPlayerId === playerId) {
    rejectIntent(socket, "INTENT_RESPOND_ESCALATION", "ESCALATION_NOT_ALLOWED", gameState.stateVersion);
    return;
  }

  const { response } = msg.payload;
  const deltas: string[] = [];

  if (response === "ACCEPT") {
    // Multiplier doubles, control transfers to opponent
    battle.escalation.multiplier *= 2;
    battle.escalation.controllerPlayerId = playerId; // Responder becomes new controller
    battle.escalation.status = "IDLE";
    gameState.stateVersion++;
    deltas.push("battle.escalation");
  } else {
    // RETREAT: invoker wins the battle
    const invokerId = battle.escalation.controllerPlayerId;
    const invokerRole = getPlayerRole(gameState, invokerId!);
    const contestedNodeId = battle.contestedNodeId;

    if (invokerRole && contestedNodeId >= 0) {
      const node = gameState.campaign.nodes[contestedNodeId];
      if (node) {
        node.owner = invokerRole;
      }
    }

    // Check capital capture
    const CAPITAL_NODES: Record<PlayerRole, number> = { HOST: 0, GUEST: 6 };
    const loserRole: PlayerRole = invokerRole === "HOST" ? "GUEST" : "HOST";
    const loserCapital = CAPITAL_NODES[loserRole];

    if (invokerRole && contestedNodeId === loserCapital) {
      gameState.campaignWinner = invokerRole;
    }

    gameState.phase = "RESOLUTION";
    gameState.battle = undefined;
    gameState.stateVersion++;
    deltas.push("phase", "battle", "campaign.nodes", "campaignWinner");
  }

  broadcastStateUpdate(io, gameState, deltas);
}
