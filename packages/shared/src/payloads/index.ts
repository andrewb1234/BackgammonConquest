import type {
  Faction,
  EscalationResponse,
  GameState,
} from "../state/index.js";

// ---------------------------------------------------------
// GENERAL ENVELOPE
// ---------------------------------------------------------

export interface SocketMessage<T> {
  type: string;
  eventId: string;
  payload: T;
  timestamp: number;
}

// ---------------------------------------------------------
// CLIENT-TO-SERVER INTENT PAYLOADS
// ---------------------------------------------------------

// Session Management

export interface CreateSessionPayload {
  clientId: string;
}

export interface JoinSessionPayload {
  clientId: string;
  sectorCode: string;
}

export interface RejoinSessionPayload {
  clientId: string;
  sessionId: string;
}

// Lobby & Campaign

export interface LockFactionPayload {
  faction: Faction;
}

export interface TargetNodePayload {
  nodeId: number;
  stateVersion: number;
}

// Pre-Battle (Loadout)

export interface ReadyLoadoutPayload {
  selectedItems: string[];
  stateVersion: number;
}

// Battle Actions (Micro-Loop)

export interface IntentRollPayload {
  stateVersion: number;
}

export interface MoveEntry {
  fromPoint: number | "BAR";
  toPoint: number;
  dieUsed: number;
}

export interface IntentMovePayload {
  moves: MoveEntry[];
  stateVersion: number;
}

export interface IntentUseItemPayload {
  itemId: string;
  targetId?: number | string;
  stateVersion: number;
}

export interface IntentInvokeEscalationPayload {
  stateVersion: number;
}

export interface IntentRespondEscalationPayload {
  response: EscalationResponse;
  stateVersion: number;
}

// Global Actions

export interface IntentForfeitPayload {
  stateVersion: number;
}

export interface AcknowledgeResultPayload {
  stateVersion: number;
}

// ---------------------------------------------------------
// INTENT TYPE UNION
// ---------------------------------------------------------

export type IntentType =
  | "CREATE_SESSION"
  | "JOIN_SESSION"
  | "REJOIN_SESSION"
  | "LOCK_FACTION"
  | "TARGET_NODE"
  | "READY_LOADOUT"
  | "INTENT_ROLL"
  | "INTENT_MOVE"
  | "INTENT_USE_ITEM"
  | "INTENT_INVOKE_ESCALATION"
  | "INTENT_RESPOND_ESCALATION"
  | "INTENT_FORFEIT"
  | "ACKNOWLEDGE_RESULT";

export type IntentPayload =
  | CreateSessionPayload
  | JoinSessionPayload
  | RejoinSessionPayload
  | LockFactionPayload
  | TargetNodePayload
  | ReadyLoadoutPayload
  | IntentRollPayload
  | IntentMovePayload
  | IntentUseItemPayload
  | IntentInvokeEscalationPayload
  | IntentRespondEscalationPayload
  | IntentForfeitPayload
  | AcknowledgeResultPayload;

// ---------------------------------------------------------
// SERVER-TO-CLIENT BROADCAST PAYLOADS
// ---------------------------------------------------------

export type RejectionReason =
  | "STALE_STATE"
  | "INVALID_MOVE"
  | "INSUFFICIENT_FUNDS"
  | "NOT_ACTIVE_PLAYER"
  | "INVALID_TARGET"
  | "INVALID_PHASE"
  | "ESCALATION_NOT_ALLOWED";

export interface StateUpdatePayload {
  gameState: GameState;
  delta: string[];
}

export interface RejectIntentPayload {
  reason: RejectionReason;
  serverStateVersion: number;
}

export interface MatchReadyPayload {
  serverStateVersion: number;
}

export interface EscalationStartedPayload {
  invokingPlayerId: string;
  timeoutMs: number;
}

export interface PeerDisconnectedPayload {
  clientId: string;
  reconnectGracePeriodMs: number;
}

export interface PeerReconnectedPayload {
  clientId: string;
}

export interface CriticalErrorPayload {
  message: string;
  code: number;
}

// ---------------------------------------------------------
// SESSION LIFECYCLE (Server → Client, non-broadcast)
// ---------------------------------------------------------

export interface SessionCreatedPayload {
  sessionId: string;
  sectorCode: string;
}

export interface SessionJoinedPayload {
  sessionId: string;
}

// ---------------------------------------------------------
// BROADCAST TYPE UNION
// ---------------------------------------------------------

export type BroadcastType =
  | "STATE_UPDATE"
  | "REJECT_INTENT"
  | "MATCH_READY"
  | "ESCALATION_STARTED"
  | "PEER_DISCONNECTED"
  | "PEER_RECONNECTED"
  | "CRITICAL_ERROR";

export type BroadcastPayload =
  | StateUpdatePayload
  | RejectIntentPayload
  | MatchReadyPayload
  | EscalationStartedPayload
  | PeerDisconnectedPayload
  | PeerReconnectedPayload
  | CriticalErrorPayload;
