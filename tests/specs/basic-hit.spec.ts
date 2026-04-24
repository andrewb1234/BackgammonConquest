import type { BattleState, Faction, GameState } from "@backgammon-conquest/shared";
import { test } from "../fixtures/game-tester";
import { resetSessions } from "../helpers/seed";

/**
 * Verify that hitting an enemy blot sends it to the Void-Buffer (bar) and
 * that the source/destination trench attributes update accordingly.
 *
 * Agentic rules observed:
 *   - State is injected — no dice-rolling RNG, no campaign traversal.
 *   - Dice pre-seeded to [3] so a single move exhausts the turn, letting us
 *     also verify data-active-role flips to GUEST.
 *   - Every click is preceded by a data-selectable / data-targetable assert.
 */

test.beforeEach(async () => {
  await resetSessions();
});

function buildHitState(hostId: string): Partial<GameState> {
  const points = Array.from({ length: 24 }, () => ({
    owner: null as null | "HOST" | "GUEST",
    count: 0,
    activeEffects: [] as never[],
  }));
  // HOST stages 5 legions on point 10 — can move 3 back to point 7.
  points[10] = { owner: "HOST", count: 5, activeEffects: [] };
  // Park the remaining 10 HOST legions somewhere benign.
  points[23] = { owner: "HOST", count: 10, activeEffects: [] };
  // GUEST has a single blot sitting on point 7 — ripe for a hit.
  points[7] = { owner: "GUEST", count: 1, activeEffects: [] };
  // Remaining 14 GUEST pieces parked on point 18 (their home).
  points[18] = { owner: "GUEST", count: 14, activeEffects: [] };

  const battle: BattleState = {
    contestedNodeId: 0,
    turnCount: 0,
    board: {
      points,
      bars: { HOST: 0, GUEST: 0 },
      borneOff: { HOST: 0, GUEST: 0 },
    },
    activePlayerId: hostId,
    dice: [3],
    diceUsed: [false],
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
        playerId: "",
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

test("Hit: HOST lands on a GUEST blot and sends it to the Void-Buffer", async ({
  seedBattleState,
  openHost,
}) => {
  const hostClientId = "pw-host-hit";
  const guestClientId = "pw-guest-hit";
  const seeded = await seedBattleState({
    hostClientId,
    guestClientId,
    state: buildHitState(hostClientId),
  });

  const host = await openHost(seeded.sessionId, seeded.hostClientId);

  // Read-before-act assertions on the seeded state.
  await host.expectTurn("HOST");
  await host.expectDiceRolled();
  await host.expectLegionCount(10, "HOST", 5);
  await host.expectLegionCount(7, "GUEST", 1);
  await host.expectLegionCount("BAR", "GUEST", 0);

  // 10 → 7 with die=3 (HOST moves high→low).
  await host.deployLegion(10, 7);
  await host.submitMoves();

  // The blot should now be on GUEST's bar; HOST owns point 7.
  await host.expectLegionCount(7, "HOST", 1);
  await host.expectLegionCount("BAR", "GUEST", 1);
  // All dice used → turn passed to GUEST.
  await host.expectTurn("GUEST");
});
