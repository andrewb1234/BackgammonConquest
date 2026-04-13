# State of Project

## Last Completed: Phase 5 — Resolution Flow & Game Polish

### What Was Built (Phase 5)
- **ACKNOWLEDGE_RESULT handler** (`resolution.ts`): Both players must acknowledge before battle result is processed. Server-side acknowledgment tracking via Map. On both ack: updates contested node ownership to battle winner, checks capital capture (node 0 = HOST capital, node 6 = GUEST capital), transitions RESOLUTION → CAMPAIGN_RESULT (capital captured) or RESOLUTION → CAMPAIGN (no capital, switch active player)
- **INTENT_FORFEIT handler** (`resolution.ts`): Allowed during BATTLE or CAMPAIGN phases. Opponent wins contested node and campaign. Checks capital capture on forfeit
- **BattleResultView**: Shows victory/defeat, borne-off counts, acknowledge button to proceed back to campaign
- **CampaignResultView**: Shows galactic supremacy/total defeat, final campaign map state, return to lobby button
- **CampaignMapView fix**: Uses player role for node targeting instead of clientId comparison. Added forfeit button
- **BattleActiveView**: Added forfeit button
- **deriveUIView update**: RESOLUTION phase now routes to CAMPAIGN_RESULT when `campaignWinner` is set, BATTLE_RESULT otherwise
- **GameState.campaignWinner**: New optional field (`PlayerRole | undefined`) for signaling global campaign victory to clients
- **Unit tests** (Vitest, 25 tests passing):
  - `boardSetup.test.ts`: createInitialBoard, getDirection, isAllInHomeBoard, isWin
  - `validMoves.test.ts`: getValidMoves (simple moves, bar entry, used dice, bearing off, hitting, blocked points), applyMove (normal move, hit to bar, bar entry, bear off), hasAnyValidMove

### What Was Built (Phase 4 — carried forward)
- **Rules engine**: boardSetup, validMoves, hasAnyValidMove
- **Server handlers**: LOCK_FACTION → CAMPAIGN, TARGET_NODE, INTENT_ROLL, INTENT_MOVE
- **BattleActiveView**: 24-point board, dice, move builder

### What Was Built (Phase 3 — carried forward)
- **Client**: Socket.io service, Zustand store, LobbyView, WaitingView, FactionSelectView, CampaignMapView, PeerOverlay

### What Was Built (Phase 2 — carried forward)
- **Server**: Session manager, intent router, broadcast system, session/lobby handlers, disconnect/reconnect

### What Was Built (Phase 1 — carried forward)
- **Monorepo**: npm workspaces with 3 packages
- **Shared**: All state model interfaces, WebSocket payload schemas, game constants

### Technical Debt / Notes
- READY_LOADOUT, INTENT_USE_ITEM, INTENT_INVOKE_ESCALATION, INTENT_RESPOND_ESCALATION handlers are still stubs
- LOADOUT, ESCALATION_PROMPT views are placeholder UIs
- Forfeit logic on grace period expiry is a TODO stub (disconnect forfeit)
- BattleActiveView move builder doesn't validate against server rules engine client-side (relies on server rejection)
- No integration tests for server handlers
- CampaignMapView doesn't validate adjacency client-side (relies on server rejection)
- No animations, sound effects, or responsive layout polish yet

### Next Step: Phase 6 — Loadout & Escalation (Tactical Items)
1. Implement READY_LOADOUT handler: validate item slots, transition BATTLE → BATTLE (loadout complete)
2. Implement INTENT_USE_ITEM handler: apply tactical item effects
3. Implement INTENT_INVOKE_ESCALATION / INTENT_RESPOND_ESCALATION handlers
4. Build LOADOUT view: item selection with Void-Scrap economy
5. Build ESCALATION_PROMPT view: escalation offer and response UI
6. Add integration tests for server handlers
