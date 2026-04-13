Title: WebSocket API and Payload Schemas
Purpose: Define the strict JSON schemas for Client-to-Server Intents and Server-to-Client Broadcasts, establishing idempotency, tracing, and multi-step validation.

1. General Envelope Structure
All WebSocket messages must wrap their data in a standard envelope to allow the router to quickly parse the event type and facilitate backend tracing.

TypeScript
interface SocketMessage<T> {
  type: string;
  eventId: string; // UUID for tracing, analytics, and debugging
  payload: T;
  timestamp: number;
}
2. Client-to-Server (INTENT Payloads)
Rule: All intents dispatched during a match must include the client's current stateVersion to guarantee idempotency against the server state.

Session Management

CREATE_SESSION: { clientId: string }

JOIN_SESSION: { clientId: string, sectorCode: string }

REJOIN_SESSION: { clientId: string, sessionId: string }

Lobby & Campaign

LOCK_FACTION: { faction: "IRON_HEGEMONY" | "SOLAR_COVENANT" }

TARGET_NODE: { nodeId: number, stateVersion: number }

Pre-Battle (Loadout)

READY_LOADOUT: { selectedItems: string[], stateVersion: number }

Battle Actions (Micro-Loop)

INTENT_ROLL: { stateVersion: number }

INTENT_MOVE:

JSON
{
  "moves": [
    { "fromPoint": 12, "toPoint": 8, "dieUsed": 4 },
    { "fromPoint": "BAR", "toPoint": 3, "dieUsed": 5 }
  ],
  "stateVersion": 10
}
INTENT_USE_ITEM:

JSON
{
  "itemId": string,
  "targetId"?: number | string, 
  "stateVersion": number
}
INTENT_INVOKE_ESCALATION: { stateVersion: number }

INTENT_RESPOND_ESCALATION: { response: "ACCEPT" | "RETREAT", stateVersion: number }

Global Actions

INTENT_FORFEIT: { stateVersion: number }

ACKNOWLEDGE_RESULT: { stateVersion: number }

3. Server-to-Client (Broadcast Payloads)
Rule: The server broadcasts the canonical state. The gameState object is always the absolute source of truth. Advisory fields like delta are provided strictly for UI animation conveniences.

State Updates

STATE_UPDATE:

JSON
{
  "gameState": GameState, // Masked for the receiving client
  "delta": string[] // Advisory only. Array of dot-path strings (e.g., "battle.board.points[12]") for UI animation triggers.
}
Rejections

REJECT_INTENT:

JSON
{
  "reason": "STALE_STATE" | "INVALID_MOVE" | "INSUFFICIENT_FUNDS" | "NOT_ACTIVE_PLAYER" | "INVALID_TARGET" | "INVALID_PHASE" | "ESCALATION_NOT_ALLOWED",
  "serverStateVersion": number
}
System & Phase Events

MATCH_READY: { serverStateVersion: number } (Explicit broadcast to unblock LOADOUT sync)

ESCALATION_STARTED: { invokingPlayerId: string, timeoutMs: number }

PEER_DISCONNECTED: { clientId: string, reconnectGracePeriodMs: number }

PEER_RECONNECTED: { clientId: string }

CRITICAL_ERROR: { message: string, code: number } (Triggers a hard drop to LOBBY)
