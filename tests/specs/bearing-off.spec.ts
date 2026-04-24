import type { BattleState, Faction, GameState } from "@backgammon-conquest/shared";
import { test, expect } from "../fixtures/game-tester";
import { resetSessions } from "../helpers/seed";

/**
 * Agentic testing rules observed:
 *   1. No full-game simulation — state is injected via /__test__/seed.
 *   2. Board state is forced into home-board with 14 borne-off so one move
 *      completes the Orbital Evacuation.
 *   3. Every action is preceded by a data-selectable / data-targetable assert
 *      via the GameTester POM.
 */

test.beforeEach(async () => {
  await resetSessions();
});

function buildBearOffState(hostId: string): Partial<GameState> {
  // HOST has 2 legions on point 5 (home), 13 already borne off.
  // Dice [6, 3] guarantees a clean bear-off via the 6 die.
  const points = Array.from({ length: 24 }, () => ({
    owner: null as null | "HOST" | "GUEST",
    count: 0,
    activeEffects: [] as never[],
  }));
  points[5] = { owner: "HOST", count: 2, activeEffects: [] };
  // GUEST needs 15 pieces to keep the game legal; park them all on point 18
  // (GUEST home) so nothing obstructs HOST's home board.
  points[18] = { owner: "GUEST", count: 15, activeEffects: [] };

  const battle: BattleState = {
    contestedNodeId: 0,
    turnCount: 0,
    board: {
      points,
      bars: { HOST: 0, GUEST: 0 },
      borneOff: { HOST: 13, GUEST: 0 },
    },
    activePlayerId: hostId,
    dice: [6, 3],
    diceUsed: [false, false],
    escalation: { status: "IDLE", multiplier: 1, controllerPlayerId: null },
    subPhase: "ACTIVE",
    loadoutReady: { HOST: true, GUEST: true },
    disabledModifierNodeId: null,
  };

  return {
    phase: "BATTLE",
    battle,
    players: [
      {
        playerId: hostId,
        role: "HOST",
        faction: "IRON_HEGEMONY" as Faction,
        voidScrap: 0,
        loadout: [],
        activeEffects: [],
        connected: true,
      },
      {
        playerId: "", // will be overwritten by seedSession with guestClientId
        role: "GUEST",
        faction: "SOLAR_COVENANT" as Faction,
        voidScrap: 0,
        loadout: [],
        activeEffects: [],
        connected: true,
      },
    ] as GameState["players"],
  };
}

test("Orbital Evacuation: HOST bears off from home board via state injection", async ({
  seedBattleState,
  openHost,
}) => {
  // 1. INJECT state directly — no campaign walk, no loadout selection.
  const hostClientId = "pw-host-bearoff";
  const guestClientId = "pw-guest-bearoff";
  const seeded = await seedBattleState({
    hostClientId,
    guestClientId,
    state: buildBearOffState(hostClientId),
  });

  // 2. OPEN the host browser context against the seeded session.
  const host = await openHost(seeded.sessionId, seeded.hostClientId);

  // 3. READ BEFORE ACT — assert the board reflects the seeded state.
  await host.expectTurn("HOST");
  await host.expectDiceRolled();
  await host.expectLegionCount(5, "HOST", 2);
  await host.expectLegionCount("ORBITAL", "HOST", 13);

  // 4. ACT — select trench-5, then click the orbital-evac indicator.
  //    The POM asserts data-selectable and data-targetable first.
  await host.bearOff(5);
  await host.submitMoves();

  // 5. VERIFY — one legion has been evacuated.
  await host.expectLegionCount("ORBITAL", "HOST", 14);
  await host.expectLegionCount(5, "HOST", 1);
});

test("selectable gating: trenches owned by opponent are never data-selectable", async ({
  seedBattleState,
  openHost,
}) => {
  const hostClientId = "pw-host-gating";
  const guestClientId = "pw-guest-gating";
  const state = buildBearOffState(hostClientId);
  const seeded = await seedBattleState({
    hostClientId,
    guestClientId,
    state,
  });

  const host = await openHost(seeded.sessionId, seeded.hostClientId);
  await host.expectTurn("HOST");
  // GUEST's pieces on point 18 must never be selectable for HOST.
  await host.expectNotSelectable(18);
  // HOST's own pieces on point 5 must be selectable with dice rolled.
  await host.expectSelectable(5);
});
