# State of Project

## Last Completed: Phase 6 — Loadout & Escalation (Tactical Items)

### What Was Built (Phase 6)
- **READY_LOADOUT handler** (`loadoutItems.ts`): Validates item count vs max slots (Maw node grants 3), validates Void-Scrap affordability, deducts cost, sets loadout. Both-ready → subPhase LOADOUT → ACTIVE
- **INTENT_USE_ITEM handler** (`loadoutItems.ts`): AIR_STRIKE (enemy blot → bar), ANGELIC_PROTECTION (invulnerability 2 turns), LUCKY_CHANCE (dice re-roll), SABOTAGE (disable enemy node modifier)
- **INTENT_INVOKE_ESCALATION handler** (`loadoutItems.ts`): Controller-only, before rolling, sets status=OFFERED
- **INTENT_RESPOND_ESCALATION handler** (`loadoutItems.ts`): ACCEPT (doubles multiplier, transfers control), RETREAT (invoker wins node, capital capture check)
- **LoadoutView**: Item catalog with costs/descriptions, Void-Scrap display, slot limits, ready-up with both-player sync
- **EscalationPromptView**: Current/next multiplier display, accept/retreat buttons for responder, waiting for invoker
- **BattleActiveView updates**: Escalation invoke button (controller, pre-roll), tactical item buttons (trigger-aware), multiplier display in header
- **TARGET_NODE updates**: Sets subPhase=LOADOUT, loadoutReady, escalation controller=attacker, grants INITIAL_VOID_SCRAP
- **INTENT_ROLL guard**: Requires subPhase=ACTIVE
- **Item catalog & economy constants**: WIN_REWARD=10, LOSS_REWARD=4, ITEM_COST=25, INITIAL_VOID_SCRAP=30, MAX_LOADOUT_SLOTS=2, MAW_EXTRA_SLOT=3
- **BattleState extensions**: subPhase (LOADOUT|ACTIVE), loadoutReady, disabledModifierNodeId
- **Removed stubs.ts**: All handlers now implemented

### What Was Built (Phase 5 — carried forward)
- **Resolution handlers**: ACKNOWLEDGE_RESULT, INTENT_FORFEIT
- **Result views**: BattleResultView, CampaignResultView
- **CampaignMapView fix**: player role for ownership
- **Unit tests**: 25 Vitest tests passing

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
- Forfeit logic on grace period expiry is a TODO stub (disconnect forfeit)
- BattleActiveView move builder doesn't validate against server rules engine client-side (relies on server rejection)
- No integration tests for server handlers
- CampaignMapView doesn't validate adjacency client-side (relies on server rejection)
- Item target selection uses prompt() — should be a proper UI selector
- Angelic Protection not enforced in validMoves (invulnerable points should block enemy moves)
- Sabotage only usable during ACTIVE sub-phase, should ideally be LOADOUT-only
- No animations, sound effects, or responsive layout polish yet
- No Void-Scrap rewards applied at end of battle (win/loss rewards)

### Next Step: Phase 7 — Polish & Integration Testing
1. Enforce Angelic Protection in validMoves (block enemy targeting of invulnerable points)
2. Apply Void-Scrap rewards at battle end (W × multiplier for winner, L for loser)
3. Replace prompt()-based item targeting with proper UI selectors (click-to-target)
4. Add integration tests for server handlers (socket.io mock)
5. Responsive layout polish and UX improvements
6. Disconnect forfeit on grace period expiry
