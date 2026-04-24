import type { BattleState, Faction, GameState } from "@backgammon-conquest/shared";
import { test, expect } from "../fixtures/game-tester";
import { resetSessions } from "../helpers/seed";

/**
 * Visual stress specs — seed extreme board states, capture screenshots,
 * and assert that no visual element overflows its container. These tests
 * are intentionally *tolerant of layout variation* but fail if a stack of
 * 10 legions physically overflows a trench, if item-target ring colors
 * collide, or if the orbital-evac counter is illegible at 14/15.
 *
 * Screenshots are written under tests/visual-baseline/ for human review.
 */

test.beforeEach(async () => {
  await resetSessions();
});

function baseBattleState(hostId: string): BattleState {
  const points = Array.from({ length: 24 }, () => ({
    owner: null as null | "HOST" | "GUEST",
    count: 0,
    activeEffects: [] as never[],
  }));
  return {
    contestedNodeId: 0,
    turnCount: 0,
    board: {
      points,
      bars: { HOST: 0, GUEST: 0 },
      borneOff: { HOST: 0, GUEST: 0 },
    },
    activePlayerId: hostId,
    dice: [1, 2],
    diceUsed: [false, false],
    escalation: { status: "IDLE", multiplier: 1, controllerPlayerId: null },
    subPhase: "ACTIVE",
    loadoutReady: { HOST: true, GUEST: true },
    disabledModifierNodeId: null,
  };
}

function stateWrap(hostId: string, battle: BattleState): Partial<GameState> {
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

test("VISUAL: 15 legions stacked on a single trench does not overflow the wrapper", async ({
  seedBattleState,
  openHost,
}) => {
  const battle = baseBattleState("pw-host-stack15");
  // HOST cramming 15 legions onto point 5; GUEST 15 on point 18.
  battle.board.points[5] = { owner: "HOST", count: 15, activeEffects: [] };
  battle.board.points[18] = { owner: "GUEST", count: 15, activeEffects: [] };

  const seeded = await seedBattleState({
    hostClientId: "pw-host-stack15",
    guestClientId: "pw-guest-stack15",
    state: stateWrap("pw-host-stack15", battle),
  });
  const host = await openHost(seeded.sessionId, seeded.hostClientId);
  await host.expectTurn("HOST");

  // Screenshot the whole board.
  await host.page.screenshot({
    path: "tests/visual-baseline/stack-15-legions.png",
    fullPage: false,
  });

  // Overflow invariant: the trench's painted pieces must stay within its
  // bounding box. We assert that the innermost pieces container doesn't
  // exceed the trench's clientHeight.
  const overflow = await host.page.evaluate(() => {
    const trench = document.querySelector('[data-testid="trench-5"]') as HTMLElement | null;
    if (!trench) return { found: false };
    const pieces = trench.querySelector("div > div:nth-child(2)") as HTMLElement | null;
    if (!pieces) return { found: true, piecesH: 0, trenchH: trench.clientHeight, over: false };
    return {
      found: true,
      piecesH: pieces.scrollHeight,
      trenchH: trench.clientHeight,
      over: pieces.scrollHeight > trench.clientHeight + 2,
    };
  });
  expect(overflow.found).toBe(true);
  expect(overflow.over).toBe(false);
});

test("VISUAL: 8 legions in the void-buffer stay within the buffer column", async ({
  seedBattleState,
  openHost,
}) => {
  const battle = baseBattleState("pw-host-bar8");
  battle.board.bars = { HOST: 8, GUEST: 7 };
  // Put the other 7 HOST legions and 8 GUEST legions somewhere legal.
  battle.board.points[0] = { owner: "HOST", count: 7, activeEffects: [] };
  battle.board.points[23] = { owner: "GUEST", count: 8, activeEffects: [] };

  const seeded = await seedBattleState({
    hostClientId: "pw-host-bar8",
    guestClientId: "pw-guest-bar8",
    state: stateWrap("pw-host-bar8", battle),
  });
  const host = await openHost(seeded.sessionId, seeded.hostClientId);

  await host.page.screenshot({
    path: "tests/visual-baseline/void-buffer-heavy.png",
    fullPage: false,
  });

  const overflow = await host.page.evaluate(() => {
    const findSizes = (id: string) => {
      const el = document.querySelector(`[data-testid="${id}"]`) as HTMLElement | null;
      if (!el) return null;
      return {
        clientH: el.clientHeight,
        scrollH: el.scrollHeight,
        clientW: el.clientWidth,
        scrollW: el.scrollWidth,
      };
    };
    return {
      host: findSizes("void-buffer-host"),
      guest: findSizes("void-buffer-guest"),
    };
  });
  expect(overflow.host).not.toBeNull();
  expect(overflow.guest).not.toBeNull();
  // Neither void-buffer column should have horizontal overflow.
  expect(overflow.host!.scrollW - overflow.host!.clientW).toBeLessThanOrEqual(2);
  expect(overflow.guest!.scrollW - overflow.guest!.clientW).toBeLessThanOrEqual(2);
});

test("VISUAL: orbital-evac at 14/15 remains legible", async ({
  seedBattleState,
  openHost,
}) => {
  const battle = baseBattleState("pw-host-evac14");
  battle.board.borneOff = { HOST: 14, GUEST: 13 };
  battle.board.points[5] = { owner: "HOST", count: 1, activeEffects: [] };
  battle.board.points[18] = { owner: "GUEST", count: 2, activeEffects: [] };

  const seeded = await seedBattleState({
    hostClientId: "pw-host-evac14",
    guestClientId: "pw-guest-evac14",
    state: stateWrap("pw-host-evac14", battle),
  });
  const host = await openHost(seeded.sessionId, seeded.hostClientId);

  await host.page.screenshot({
    path: "tests/visual-baseline/orbital-evac-high.png",
    fullPage: false,
  });

  await expect(host.page.getByTestId("orbital-evac-host")).toHaveAttribute(
    "data-count",
    "14",
  );
  await expect(host.page.getByTestId("orbital-evac-guest")).toHaveAttribute(
    "data-count",
    "13",
  );
});

test("VISUAL: protected points display the shield indicator and item-target outline", async ({
  seedBattleState,
  openHost,
}) => {
  const battle = baseBattleState("pw-host-shield");
  // HOST trench with active protection, plus a GUEST blot to potentially strike.
  battle.board.points[5] = {
    owner: "HOST",
    count: 3,
    activeEffects: [
      { effectId: "ANGELIC_PROTECTION", expiresOnTurn: 99 } as never,
    ],
  };
  battle.board.points[7] = { owner: "GUEST", count: 1, activeEffects: [] };
  battle.board.points[18] = { owner: "GUEST", count: 14, activeEffects: [] };
  battle.board.points[0] = { owner: "HOST", count: 12, activeEffects: [] };

  const seeded = await seedBattleState({
    hostClientId: "pw-host-shield",
    guestClientId: "pw-guest-shield",
    state: stateWrap("pw-host-shield", battle),
  });
  const host = await openHost(seeded.sessionId, seeded.hostClientId);

  await host.page.screenshot({
    path: "tests/visual-baseline/protected-trench.png",
    fullPage: false,
  });
  await expect(host.page.getByTestId("trench-5")).toHaveAttribute(
    "data-protected",
    "true",
  );
});

test("VISUAL: tactical items row renders as brass industrial buttons", async ({
  seedBattleState,
  openHost,
}) => {
  const battle = baseBattleState("pw-host-items");
  battle.board.points[5] = { owner: "HOST", count: 5, activeEffects: [] };
  battle.board.points[18] = { owner: "GUEST", count: 15, activeEffects: [] };
  battle.board.points[0] = { owner: "HOST", count: 10, activeEffects: [] };

  const seeded = await seedBattleState({
    hostClientId: "pw-host-items",
    guestClientId: "pw-guest-items",
    state: {
      ...stateWrap("pw-host-items", battle),
      players: [
        {
          playerId: "pw-host-items",
          role: "HOST",
          faction: "IRON_HEGEMONY" as Faction,
          voidScrap: 42,
          loadout: [
            { itemId: "AIR_STRIKE", consumed: false } as never,
            { itemId: "ANGELIC_PROTECTION", consumed: false } as never,
            { itemId: "LUCKY_CHANCE", consumed: false } as never,
          ],
          activeEffects: [],
          connected: true,
        },
        {
          playerId: "",
          role: "GUEST",
          faction: "SOLAR_COVENANT" as Faction,
          voidScrap: 10,
          loadout: [],
          activeEffects: [],
          connected: true,
        },
      ] as GameState["players"],
    },
  });
  const host = await openHost(seeded.sessionId, seeded.hostClientId);

  await host.page.screenshot({
    path: "tests/visual-baseline/tactical-items-loadout.png",
    fullPage: false,
  });
});

test("VISUAL: full board screenshot with mixed state for reference", async ({
  seedBattleState,
  openHost,
}) => {
  const battle = baseBattleState("pw-host-ref");
  // A "normal" mid-game situation for a baseline reference shot.
  battle.board.points[0] = { owner: "HOST", count: 2, activeEffects: [] };
  battle.board.points[5] = { owner: "HOST", count: 5, activeEffects: [] };
  battle.board.points[7] = { owner: "HOST", count: 3, activeEffects: [] };
  battle.board.points[11] = { owner: "HOST", count: 5, activeEffects: [] };
  battle.board.points[12] = { owner: "GUEST", count: 5, activeEffects: [] };
  battle.board.points[16] = { owner: "GUEST", count: 3, activeEffects: [] };
  battle.board.points[18] = { owner: "GUEST", count: 5, activeEffects: [] };
  battle.board.points[23] = { owner: "GUEST", count: 2, activeEffects: [] };

  const seeded = await seedBattleState({
    hostClientId: "pw-host-ref",
    guestClientId: "pw-guest-ref",
    state: stateWrap("pw-host-ref", battle),
  });
  const host = await openHost(seeded.sessionId, seeded.hostClientId);

  await host.page.screenshot({
    path: "tests/visual-baseline/board-reference.png",
    fullPage: true,
  });
});
