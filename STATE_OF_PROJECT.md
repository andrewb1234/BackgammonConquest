# State of Project

## Last Completed: Phase 7 — Polish & Integration Testing

### What Was Built (Phase 7)
- **Angelic Protection in validMoves**: `isPointOpen` now checks for `ANGELIC_PROTECTION` active effect — blocks enemy hits on invulnerable blots
- **Void-Scrap rewards at battle end**: `applyRewards` helper in resolution.ts — winner gets W×multiplier, loser gets L. Applied in both `handleAcknowledgeResult` and `handleIntentForfeit`. Broadcast includes "players" delta
- **Click-to-target UI**: Replaced `prompt()` calls in BattleActiveView with `targetingItem` state. Click a point on the board to target for AIR_STRIKE/ANGELIC_PROTECTION. Visual highlighting via `isItemTarget` prop on PointComponent. Cancel button to exit targeting mode
- **Sabotage restricted to LOADOUT**: Server-side `subPhase !== "LOADOUT"` check for SABOTAGE in `handleIntentUseItem`. LoadoutView shows Sabotage use buttons during LOADOUT phase
- **18 integration tests**: `apps/server/src/handlers/__tests__/loadoutItems.test.ts` — READY_LOADOUT (5), INVOKE_ESCALATION (3), RESPOND_ESCALATION (4), USE_ITEM (6). Uses real session manager with `_resetForTesting()` for isolation
- **Responsive layout**: max-w-2xl container in App.tsx, p-4 padding, Void-Scrap display in CampaignMapView, BattleActiveView header, and BattleResultView
- **Unit test for Angelic Protection**: Added 2 test cases in `validMoves.test.ts` (blocks enemy hit on protected blot, allows hit on unprotected blot)

### What Was Built (Phase 6 — carried forward)
- **READY_LOADOUT, INTENT_USE_ITEM, INVOKE_ESCALATION, RESPOND_ESCALATION handlers**
- **LoadoutView, EscalationPromptView, BattleActiveView updates**
- **Item catalog & economy constants**

### What Was Built (Phases 1–5 — carried forward)
- **Rules engine**: boardSetup, validMoves, hasAnyValidMove
- **Server handlers**: All campaign/battle/resolution handlers implemented
- **Client**: All views implemented (Lobby, Waiting, FactionSelect, CampaignMap, Loadout, BattleActive, EscalationPrompt, BattleResult, CampaignResult, PeerOverlay)
- **Monorepo**: npm workspaces with 3 packages

### Test Status
- **27 shared tests** (boardSetup: 12, validMoves: 15)
- **18 server integration tests** (loadoutItems handlers)
- **Total: 45 tests passing**

### Technical Debt / Notes
- Forfeit logic on grace period expiry is a TODO stub (disconnect forfeit)
- BattleActiveView move builder doesn't validate against server rules engine client-side (relies on server rejection)
- CampaignMapView doesn't validate adjacency client-side (relies on server rejection)
- No animations or sound effects yet
- No integration tests for campaign/battle/resolution handlers (only loadoutItems covered)

### Next Step: Phase 8 — Disconnect Forfeit & Final QA
1. Implement disconnect forfeit on grace period expiry
2. Add integration tests for campaign/battle/resolution handlers
3. Animation polish (dice roll, piece movement, hit effects)
4. Sound effects
5. End-to-end smoke test
