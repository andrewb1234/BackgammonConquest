# State of Project

## Last Completed: Phase 4 — Campaign Logic & Backgammon Rules Engine

### What Was Built (Phase 4)
- **Backgammon rules engine** (`/packages/shared/src/rules/`):
  - `boardSetup.ts`: `createInitialBoard` (standard 24-point setup), `getDirection` (HOST: -1, GUEST: +1), `isAllInHomeBoard`, `isWin` (15 pieces borne off)
  - `validMoves.ts`: `getValidMoves` (all legal moves for current dice), `applyMove` (board mutation with hit/bar/bear-off), `hasAnyValidMove`; handles bar entry, normal moves, hitting, bearing off (exact + overshoot), doubles (4 dice)
- **LOCK_FACTION → CAMPAIGN transition**: When both players lock factions, server transitions `phase` from `LOBBY` to `CAMPAIGN`
- **TARGET_NODE handler** (`campaign.ts`): Validates active player, adjacency (linear 7-node map), non-own-node targeting; creates `BattleState` with initial board, transitions to `BATTLE` phase
- **INTENT_ROLL handler** (`battle.ts`): Server-authoritative dice generation (2 dice, doubles → 4), auto-pass if no valid moves
- **INTENT_MOVE handler** (`battle.ts`): Validates each move against rules engine, consumes dice, applies moves sequentially with hit detection, auto-passes turn when all dice used or no valid moves remain, detects win → `RESOLUTION` phase
- **BattleActiveView UI**: 24-point board with top/bottom row layout, piece counts, owner colors, Void-Buffer (bar) display, Orbital Evacuation (borne off) counters, dice display with used/unused state, Roll Dice button, click-to-select + click-to-target move builder, Submit/Clear pending moves, valid target highlighting, rejection feedback

### What Was Built (Phase 3 — carried forward)
- **Client**: Socket.io service, Zustand store, LobbyView, WaitingView, FactionSelectView, CampaignMapView, PeerOverlay

### What Was Built (Phase 2 — carried forward)
- **Server**: Session manager, intent router, broadcast system, session/lobby handlers, disconnect/reconnect

### What Was Built (Phase 1 — carried forward)
- **Monorepo**: npm workspaces with 3 packages
- **Shared**: All state model interfaces, WebSocket payload schemas, game constants

### Technical Debt / Notes
- READY_LOADOUT, INTENT_USE_ITEM, INTENT_INVOKE_ESCALATION, INTENT_RESPOND_ESCALATION, INTENT_FORFEIT, ACKNOWLEDGE_RESULT handlers are still stubs
- LOADOUT, ESCALATION_PROMPT, BATTLE_RESULT, CAMPAIGN_RESULT views are placeholder UIs
- CampaignMapView node ownership uses `clientId` comparison — should use player role
- No unit tests for rules engine or server handlers
- No integration tests
- Forfeit logic on grace period expiry is a TODO stub
- BattleActiveView move builder doesn't validate against server rules engine client-side (relies on server rejection)
- RESOLUTION phase has no handler to transition back to CAMPAIGN or end the game

### Next Step: Phase 5 — Resolution Flow & Game Polish
1. Implement ACKNOWLEDGE_RESULT handler: transition RESOLUTION → CAMPAIGN (update node ownership, check capital capture for global win)
2. Implement INTENT_FORFEIT handler: end session, notify opponent
3. Build BATTLE_RESULT view: show winner, acknowledge button
4. Build CAMPAIGN_RESULT view: show global winner, return to lobby
5. Add unit tests for rules engine (Vitest)
6. Polish UI: responsive board layout, animations, sound effects
