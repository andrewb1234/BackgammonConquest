# State of Project

## Last Completed: Playwright Testing Infrastructure

### What Was Built (This Session)
- **Phase 1 — DOM Semantic Instrumentation**: `TacticalBoard.tsx` and `BattleActiveView.tsx` now expose `data-testid` + state-bearing attributes (`data-owner`, `data-count`, `data-selectable`, `data-targetable`, `data-active-role`, `data-state-version`, `data-dice`, etc.) so Playwright never relies on coordinates or CSS.
- **Phase 1 — Bearing-off UI wiring**: `orbital-evac-host` / `orbital-evac-guest` indicators are now real click-targets that surface `data-targetable="true"` when the rules engine exposes a bear-off move (fixing a latent UX gap where bearing off had no clickable target).
- **Phase 2 — GameTester Page Object Model** (`tests/fixtures/game-tester.ts`): domain-specific POM exposing `deployLegion`, `bearOff`, `rollDice`, `submitMoves`, `expectLegionCount`, `expectTurn`, `expectSelectable/Targetable`. All waits key off `data-state-version` — no arbitrary sleeps.
- **Phase 3a — Server state-injection hook**: `POST /__test__/seed` + `/__test__/reset` mounted only when `ENABLE_TEST_HOOKS=1`. `sessionManager.seedSession()` deep-merges a caller-supplied partial `GameState` over a two-player lobby default and indexes both players for REJOIN.
- **Phase 3b — Deterministic rejoin**: `useGameStore` reads `?clientId=&sessionId=` from `window.location` and auto-dispatches `REJOIN_SESSION` on socket connect. Behavior is inert without query params.
- **Phase 3c — Playwright wiring**: `playwright.config.ts` spins up client on 5199 and server on 3099 (ENABLE_TEST_HOOKS=1) to avoid conflicts with other local dev servers. Two example specs pass end-to-end:
  - `tests/specs/bearing-off.spec.ts` — Orbital Evacuation via state injection + a selectable-gating spec
  - `tests/specs/basic-hit.spec.ts` — hit-to-Void-Buffer + turn-pass

### Test Status
- **27 shared tests** (boardSetup: 12, validMoves: 15)
- **50 server integration tests** (loadoutItems: 18, campaign: 6, battle: 7, resolution: 11, session: 8)
- **3 Playwright e2e tests** (bearing-off, selectable gating, hit)
- **Total: 80 tests passing**

### Technical Debt
- Server `dotenv` path is hardcoded to `../../.env` — OK on Render (uses env vars directly).
- No integration tests for disconnect/reconnect flow (hard to test with setTimeout).
- Playwright tests only cover HOST-perspective flows. A two-browser context spec would exercise the real-time socket broadcast end-to-end.
- Dice are still rolled via `Math.random()` server-side; deterministic tests sidestep this by pre-seeding `battle.dice`. A seeded RNG hook would let us also test `INTENT_ROLL`.

### Deployment (previous session)
- **Client**: https://backgammon-conquest.onrender.com
- **Server**: https://backgammon-conquest-server.onrender.com
- **GitHub**: https://github.com/andrewb1234/BackgammonConquest

---

## Previous Session: Production Deployment

### What Was Built
- **Sound effects**: Procedural Web Audio API sound system (`apps/client/src/services/sounds.ts`) — dice roll, hit, move, escalation alarm, victory fanfare, defeat tone, item blip. Wired into BattleActiveView, BattleResultView, EscalationPromptView.
- **Session handler integration tests**: 8 tests for `handleCreateSession`, `handleJoinSession`, `handleRejoinSession` — covers session creation, duplicate rejection, invalid sector code, full session rejection, rejoin with reconnect.
- **Client-side move validation**: BattleActiveView now uses shared `getValidMoves` rules engine instead of manual calculation. CampaignMapView now validates adjacency before enabling node targeting.
- **Production deployment**: Both services live on Render:
  - Server: https://backgammon-conquest-server.onrender.com
  - Client: https://backgammon-conquest.onrender.com

### What Was Built (Phase 8)
- **Disconnect forfeit on grace period expiry**: `applyForfeit()` extracted as reusable function, wired into 45s grace period timeout.
- **Campaign/battle/resolution integration tests**: 24 tests across 3 files.
- **Animation polish**: Dice roll bounce, point count transitions, ANGELIC_PROTECTION shield indicator, campaign node hover scale, victory/defeat animations.

### What Was Built (Phase 7)
- Angelic Protection in validMoves, Void-Scrap rewards, click-to-target UI, Sabotage LOADOUT-only, 18 loadoutItems tests, responsive layout.

### What Was Built (Phases 1–6)
- Rules engine (boardSetup, validMoves, hasAnyValidMove)
- All server handlers (campaign, battle, resolution, loadout, escalation, session)
- All client views (Lobby, Waiting, FactionSelect, CampaignMap, Loadout, BattleActive, EscalationPrompt, BattleResult, CampaignResult, PeerOverlay)
- Monorepo with npm workspaces

### Test Status
- **27 shared tests** (boardSetup: 12, validMoves: 15)
- **50 server integration tests** (loadoutItems: 18, campaign: 6, battle: 7, resolution: 11, session: 8)
- **Total: 77 tests passing**

### Production URLs
- **Client**: https://backgammon-conquest.onrender.com
- **Server**: https://backgammon-conquest-server.onrender.com
- **GitHub**: https://github.com/andrewb1234/BackgammonConquest

### Technical Debt
- Server `dotenv` path is hardcoded to `../../.env` — won't work in production (Render uses env vars directly, so this is fine)
- No integration tests for disconnect/reconnect flow (hard to test with setTimeout)
- No E2E browser tests (Playwright/Cypress)

### Next Steps
- E2E browser tests (Playwright)
- Disconnect/reconnect integration test with fake timers
- Lobby UX polish (faction selection animations)
- Mobile touch optimization
