# State of Project

## Last Completed: Phase 2 — Backend Server & Socket.io Scaffolding

### What Was Built (Phase 2)
- **GameState.stateVersion**: Added per NETWORKING_SYNC.md — initialized at 0, incremented +1 per valid mutation
- **sessionManager.ts**: In-memory `Map<sessionId, GameState>`, sector code index (`Map<sectorCode, sessionId>`), player-session index (`Map<playerId, sessionId>`). Operations: create, join, rejoin, disconnect, getByPlayerId
- **broadcast.ts**: Helpers for `STATE_UPDATE`, `REJECT_INTENT`, `PEER_DISCONNECTED`, `PEER_RECONNECTED`, `CRITICAL_ERROR` with socket room management (`session:<sessionId>`)
- **intentRouter.ts**: Dispatches `SocketMessage` by `IntentType` to registered handler functions
- **handlers/session.ts**: `CREATE_SESSION` (generates 6-digit sector code, initializes LOBBY state), `JOIN_SESSION` (validates sector code, assigns guest), `REJOIN_SESSION` (reconnects with grace period)
- **handlers/lobby.ts**: `LOCK_FACTION` (mutually exclusive faction enforcement)
- **handlers/stubs.ts**: All remaining intents (`TARGET_NODE`, `READY_LOADOUT`, `INTENT_ROLL`, `INTENT_MOVE`, `INTENT_USE_ITEM`, `INTENT_INVOKE_ESCALATION`, `INTENT_RESPOND_ESCALATION`, `INTENT_FORFEIT`, `ACKNOWLEDGE_RESULT`) — reject with `INVALID_PHASE` and include `STALE_STATE` version checking
- **index.ts**: Full Socket.io lifecycle — `IDENTIFY` event for client identity, `INTENT` routing, disconnect handling with 45s reconnect grace period and auto-forfeit on expiry

### What Was Built (Phase 1 — carried forward)
- **Monorepo**: npm workspaces with 3 packages (`apps/client`, `apps/server`, `packages/shared`)
- **Client**: React 18 + Vite + Tailwind CSS + Zustand + Socket.io-client scaffolded and serving on `:5173`
- **Shared — State Model**: All TypeScript interfaces from `STATE_MODEL.md` implemented
- **Shared — Payloads**: Full WebSocket API from `WEBSOCKET_PAYLOADS.md` implemented
- **Shared — Constants**: `PIECES_PER_PLAYER`, `CAMPAIGN_NODE_COUNT`, `BOARD_POINT_COUNT`, `STANDARD_DICE_COUNT`, `DOUBLES_DICE_COUNT`

### Technical Debt / Notes
- Battle, campaign, loadout, and escalation handlers are stubs (reject with INVALID_PHASE)
- Client is still a stub — no Zustand store, no Socket.io connection, no UI beyond placeholder
- No unit tests written yet for shared package
- No integration tests written yet for server
- Forfeit logic on grace period expiry is a TODO stub
- `SESSION_CREATED` and `SESSION_JOINED` events are emitted but not yet defined in shared payload types

### Next Step: Phase 3 — Client Socket.io Connection & Zustand Store
1. Create Socket.io client service with `IDENTIFY`, `INTENT` emit helpers
2. Implement Zustand game store that syncs on `STATE_UPDATE` broadcasts
3. Implement `REJECT_INTENT` handler in store (sync to latest stateVersion)
4. Build Lobby UI: Create Game / Join Game / Faction Selection
5. Wire UI actions to dispatch intents through the store
