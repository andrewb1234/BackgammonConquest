import type { Socket } from "socket.io";
import type { Server as SocketServer } from "socket.io";
import type { IntentType, SocketMessage } from "@backgammon-conquest/shared";
import { handleCreateSession, handleJoinSession, handleRejoinSession } from "./handlers/session.js";
import { handleLockFaction } from "./handlers/lobby.js";
import { handleTargetNode } from "./handlers/campaign.js";
import { handleIntentRoll, handleIntentMove } from "./handlers/battle.js";
import { handleAcknowledgeResult, handleIntentForfeit } from "./handlers/resolution.js";
import {
  handleReadyLoadout,
  handleIntentUseItem,
  handleIntentInvokeEscalation,
  handleIntentRespondEscalation,
} from "./handlers/stubs.js";

// ---------------------------------------------------------
// INTENT ROUTER
// ---------------------------------------------------------

type HandlerFn = (io: SocketServer, socket: Socket, msg: SocketMessage<any>) => void;

const router: Record<IntentType, HandlerFn> = {
  CREATE_SESSION: handleCreateSession,
  JOIN_SESSION: handleJoinSession,
  REJOIN_SESSION: handleRejoinSession,
  LOCK_FACTION: handleLockFaction,
  TARGET_NODE: handleTargetNode,
  READY_LOADOUT: handleReadyLoadout,
  INTENT_ROLL: handleIntentRoll,
  INTENT_MOVE: handleIntentMove,
  INTENT_USE_ITEM: handleIntentUseItem,
  INTENT_INVOKE_ESCALATION: handleIntentInvokeEscalation,
  INTENT_RESPOND_ESCALATION: handleIntentRespondEscalation,
  INTENT_FORFEIT: handleIntentForfeit,
  ACKNOWLEDGE_RESULT: handleAcknowledgeResult,
};

export function routeIntent(
  io: SocketServer,
  socket: Socket,
  msg: SocketMessage<any>,
): void {
  const handler = router[msg.type as IntentType];
  if (!handler) {
    console.warn(`[Router] Unknown intent type: ${msg.type}`);
    return;
  }
  handler(io, socket, msg);
}
