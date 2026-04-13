# State of Project

## Last Completed: Phase 3 — Client Socket.io Connection & Zustand Store

### What Was Built (Phase 3)
- **Socket.io client service** (`services/socket.ts`): `connectSocket`, `identify`, `sendIntent<T>` with `SocketMessage<T>` envelope, typed listeners for all server broadcasts (`STATE_UPDATE`, `REJECT_INTENT`, `PEER_DISCONNECTED`, `PEER_RECONNECTED`, `CRITICAL_ERROR`, `SESSION_CREATED`, `SESSION_JOINED`)
- **Zustand game store** (`store/useGameStore.ts`): `GameState` sync on `STATE_UPDATE`, `REJECT_INTENT` handler with `stateVersion` sync, peer disconnect/reconnect tracking, critical error handling, UI view derivation from `GameState.phase` per `UI_STATE_MACHINE.md`, intent dispatch helpers (`createSession`, `joinSession`, `lockFaction`, `sendGameIntent`)
- **LobbyView**: Create Game / Join Game with 6-character sector code input
- **WaitingView**: Displays sector code for host, waiting indicator with pulse animation
- **FactionSelectView**: Iron Hegemony / Solar Covenant with mutually exclusive selection, rejection feedback, opponent-waiting state
- **CampaignMapView**: 7-node display with active player targeting, owner color coding
- **PeerOverlay**: Blocking overlay on opponent disconnect
- **App.tsx**: View router driven by `store.uiView`, critical error banner, placeholder views for unimplemented phases
- **SessionCreatedPayload / SessionJoinedPayload**: Added to shared payloads (server already emits these)

### What Was Built (Phase 2 — carried forward)
- **Server**: Session manager, intent router, broadcast system, session/lobby handlers, stub handlers for remaining intents, disconnect/reconnect with 45s grace period

### What Was Built (Phase 1 — carried forward)
- **Monorepo**: npm workspaces with 3 packages
- **Shared**: All state model interfaces, WebSocket payload schemas, game constants

### Technical Debt / Notes
- Battle, loadout, and escalation handlers are server stubs (reject with INVALID_PHASE)
- Campaign TARGET_NODE handler is a server stub
- LOADOUT, BATTLE_ACTIVE, ESCALATION_PROMPT, BATTLE_RESULT, CAMPAIGN_RESULT views are placeholder UIs
- No unit tests written yet for shared package
- No integration tests written yet for server
- Forfeit logic on grace period expiry is a TODO stub
- CampaignMapView node ownership check uses `clientId` instead of player role — needs fix when campaign logic is implemented

### Next Step: Phase 4 — Campaign Logic & Backgammon Rules Engine
1. Implement campaign phase transition in server (LOBBY → CAMPAIGN after both factions locked)
2. Implement TARGET_NODE handler: validate ownership, transition to BATTLE phase
3. Implement backgammon rules engine in `/packages/shared/src/rules/` (valid moves, dice consumption, hitting, bearing off)
4. Implement INTENT_ROLL handler: server-authoritative dice generation
5. Implement INTENT_MOVE handler: validate moves against rules engine, mutate board state
6. Build BATTLE_ACTIVE UI: 24-point board rendering with piece counts
