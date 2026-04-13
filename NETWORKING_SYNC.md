# Server Authority, Concurrency, and Reconnection Protocol

## Purpose
Define client/server boundaries, idempotency, timeouts, and deterministic recovery.

---

## 1. State Versioning

```ts
GameState { stateVersion: number }
Initialized at 0
Server increments by +1 per valid mutation
All INTENT payloads must include stateVersion
2. Concurrency & Idempotency
Stale Intents:
If intent.stateVersion < server.stateVersion → reject
REJECT_INTENT {
  reason: "STALE_STATE"
  serverStateVersion: number
}
Idempotency:
Duplicate packets fail version check and are discarded
Client Behavior:
On rejection → sync to latest state
Client automatically applies the latest GameState. All intents require manual user re-input based on the new visual state
3. Authority Boundaries
Clients send INTENT only, never mutate state
Server validates → mutates → increments version → broadcasts STATE_UPDATE
Win Condition:
Server-evaluated only
If borneOff[player] === 15 → force BATTLE_RESULT
4. Atomic Action Integrity
Multi-step flows (e.g., Escalation) are version-bound
Responses must match current stateVersion
Late or mismatched responses are rejected
5. Partial Disconnect Handling
On disconnect:
PlayerState.connected = false
Broadcast to both clients
Client UI:
Show blocking overlay: “Opponent Disconnected”
Pause all timers
6. Timeouts
TURN_TIMEOUT: 60s → auto-pass
ESCALATION_TIMEOUT: 20s → force RETREAT
RESULT_ACK_TIMEOUT: 15s → auto-advance
RECONNECT_GRACE_PERIOD: 45s
Timer Resume:
Resume with remaining time after reconnect
7. Forfeit Semantics
Available anytime except LOBBY/WAITING
Server immediately:
Assigns loss
Applies L payout (40%)
Forces BATTLE_RESULT
8. Reconnection
Client sends:
REJOIN_SESSION { sessionId, playerId }
Server:
Validates grace period
Returns full GameState
Sets connected = true
Routing:
Client mounts view from GameState.phase
UI is a pure projection of state (no replay)
Race Condition Rule:
If grace expired → reject reconnect → forfeit applies
