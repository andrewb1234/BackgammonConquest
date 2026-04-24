import { test as base, expect, type Page, type Locator } from "@playwright/test";
import { seedBattle, type SeedBattleRequest, type SeedBattleResponse } from "../helpers/seed";

/**
 * GameTester
 * ----------
 * Domain-specific Page Object Model for BackgammonConquest.
 *
 * This POM purely consumes the semantic DOM contract established in
 * TacticalBoard.tsx / BattleActiveView.tsx. It never relies on visual
 * coordinates, CSS class names, or SVG paths.
 *
 * Contract consumed:
 * - [data-testid="battle-active"] root with data-my-role / data-active-role
 *   / data-state-version / data-turn-count / data-dice
 * - [data-testid="tactical-board"] — game board root
 * - [data-testid="trench-{0..23}"] — each point, with data-owner / data-count
 *   / data-selectable / data-targetable
 * - [data-testid="void-buffer-host"|"void-buffer-guest"] — bars
 * - [data-testid="orbital-evac-host"|"orbital-evac-guest"] — bear-off
 * - [data-testid="btn-roll-dice"|"btn-submit-moves"|"btn-clear-moves"|"btn-forfeit"]
 *
 * Agentic workflow rules enforced by this POM:
 *   1. `deployLegion` asserts source.data-selectable="true" *before* clicking.
 *   2. `deployLegion` asserts target.data-targetable="true" *before* clicking.
 *   3. All waits key off `data-state-version` — never arbitrary setTimeouts.
 */

export type Owner = "HOST" | "GUEST";
export type TrenchIndex = number; // 0..23
export type LegionLocation = TrenchIndex | "BAR" | "ORBITAL";

export class GameTester {
  constructor(public readonly page: Page, public readonly role: Owner) {}

  // ---------------------------------------------------------------------
  // LOCATORS
  // ---------------------------------------------------------------------

  private root(): Locator {
    return this.page.getByTestId("battle-active");
  }

  private trench(index: TrenchIndex): Locator {
    if (index < 0 || index > 23) {
      throw new Error(`Trench index out of range: ${index}`);
    }
    return this.page.getByTestId(`trench-${index}`);
  }

  private voidBuffer(owner: Owner): Locator {
    return this.page.getByTestId(owner === "HOST" ? "void-buffer-host" : "void-buffer-guest");
  }

  private orbitalEvac(owner: Owner): Locator {
    return this.page.getByTestId(owner === "HOST" ? "orbital-evac-host" : "orbital-evac-guest");
  }

  // ---------------------------------------------------------------------
  // WAITERS — key off data-state-version, never arbitrary sleeps
  // ---------------------------------------------------------------------

  /** Wait for the battle-active view to appear (post-rejoin). */
  async waitForBattle(): Promise<void> {
    await expect(this.root()).toBeVisible();
    await expect(this.root()).toHaveAttribute("data-my-role", this.role);
  }

  async currentStateVersion(): Promise<number> {
    const v = await this.root().getAttribute("data-state-version");
    return v ? parseInt(v, 10) : 0;
  }

  /**
   * Wait for the server state version to advance past `from`. Used after any
   * intent dispatch to ensure the broadcast has arrived before asserting.
   */
  async waitForStateAdvance(from: number, timeoutMs = 5000): Promise<void> {
    await expect
      .poll(() => this.currentStateVersion(), { timeout: timeoutMs })
      .toBeGreaterThan(from);
  }

  // ---------------------------------------------------------------------
  // ASSERTIONS — read-only view of DOM state
  // ---------------------------------------------------------------------

  async expectTurn(role: Owner): Promise<void> {
    await expect(this.root()).toHaveAttribute("data-active-role", role);
  }

  async expectDiceRolled(): Promise<void> {
    await expect(this.root()).not.toHaveAttribute("data-dice", "");
  }

  async expectNoDice(): Promise<void> {
    await expect(this.root()).toHaveAttribute("data-dice", "");
  }

  async expectSelectable(index: TrenchIndex): Promise<void> {
    await expect(this.trench(index)).toHaveAttribute("data-selectable", "true");
  }

  async expectNotSelectable(index: TrenchIndex): Promise<void> {
    await expect(this.trench(index)).toHaveAttribute("data-selectable", "false");
  }

  async expectTargetable(index: TrenchIndex): Promise<void> {
    await expect(this.trench(index)).toHaveAttribute("data-targetable", "true");
  }

  async expectLegionCount(
    location: LegionLocation,
    owner: Owner,
    count: number,
  ): Promise<void> {
    const locator = this.locatorFor(location, owner);
    if (location === "ORBITAL") {
      // Orbital-evac only tracks a count, there is no owner attribute.
      await expect(locator).toHaveAttribute("data-count", String(count));
      return;
    }
    if (count === 0) {
      // Empty trenches have data-owner="" (no PlayerRole).
      await expect(locator).toHaveAttribute("data-count", "0");
    } else {
      await expect(locator).toHaveAttribute("data-owner", owner);
      await expect(locator).toHaveAttribute("data-count", String(count));
    }
  }

  private locatorFor(location: LegionLocation, owner: Owner): Locator {
    if (location === "BAR") return this.voidBuffer(owner);
    if (location === "ORBITAL") return this.orbitalEvac(owner);
    return this.trench(location);
  }

  // ---------------------------------------------------------------------
  // ACTIONS — high-level game intents
  // ---------------------------------------------------------------------

  /**
   * Roll dice. Asserts the Roll button is present (implicitly requires
   * isMyTurn && !dice) before clicking.
   */
  async rollDice(): Promise<void> {
    const before = await this.currentStateVersion();
    await this.page.getByTestId("btn-roll-dice").click();
    await this.waitForStateAdvance(before);
    // Dice may be empty string only if the server auto-passed the turn
    // because no valid moves existed. Callers can inspect via expectDiceRolled.
  }

  /**
   * Deploy a legion (move a single piece) from a trench (or the bar) to
   * another trench. Follows the "Read Before Act" rule: asserts
   * data-selectable on source and data-targetable on target before clicking.
   *
   * @param from  Source trench index (0..23) or "BAR" to re-enter from the bar.
   * @param to    Destination trench index (0..23).
   */
  async deployLegion(
    from: TrenchIndex | "BAR",
    to: TrenchIndex,
  ): Promise<void> {
    // 1. Select the source.
    if (from === "BAR") {
      const bar = this.voidBuffer(this.role);
      await expect(bar).toHaveAttribute("data-selectable", "true");
      await bar.click();
    } else {
      await this.expectSelectable(from);
      await this.trench(from).click();
    }

    // 2. Pick the trench target.
    await this.expectTargetable(to);
    await this.trench(to).click();
  }

  /**
   * Bear a single piece off from `from` (Orbital Evacuation). Clicks the
   * source trench, then the orbital-evac indicator once it becomes
   * data-targetable="true".
   */
  async bearOff(from: TrenchIndex): Promise<void> {
    await this.expectSelectable(from);
    await this.trench(from).click();
    const orbital = this.orbitalEvac(this.role);
    await expect(orbital).toHaveAttribute("data-targetable", "true");
    await orbital.click();
  }

  /**
   * Submit all pending moves accumulated via deployLegion / bearOff.
   * Waits for state-version advance.
   */
  async submitMoves(): Promise<void> {
    const btn = this.page.getByTestId("btn-submit-moves");
    await expect(btn).toBeVisible();
    const before = await this.currentStateVersion();
    await btn.click();
    await this.waitForStateAdvance(before);
  }

  /** Clear pending (unsubmitted) moves. No state-version advance expected. */
  async clearMoves(): Promise<void> {
    await this.page.getByTestId("btn-clear-moves").click();
  }

  /**
   * Execute a single move end-to-end: deploy then submit. Convenience for the
   * common case of 1 move per turn.
   */
  async playSingleMove(
    from: TrenchIndex | "BAR",
    to: TrenchIndex | "ORBITAL",
  ): Promise<void> {
    if (to === "ORBITAL") {
      if (from === "BAR") throw new Error("Cannot bear off from BAR");
      await this.bearOff(from);
    } else {
      await this.deployLegion(from, to as TrenchIndex);
    }
    await this.submitMoves();
  }
}

// ---------------------------------------------------------------------
// PLAYWRIGHT FIXTURE EXTENSION
// ---------------------------------------------------------------------

type GameFixtures = {
  seedBattleState: (state: SeedBattleRequest) => Promise<SeedBattleResponse>;
  openHost: (sessionId: string, clientId: string) => Promise<GameTester>;
  openGuest: (sessionId: string, clientId: string) => Promise<GameTester>;
};

export const test = base.extend<GameFixtures>({
  seedBattleState: async ({}, use) => {
    await use(async (state: SeedBattleRequest) => seedBattle(state));
  },

  openHost: async ({ browser }, use) => {
    const openedPages: Page[] = [];
    await use(async (sessionId: string, clientId: string) => {
      const context = await browser.newContext();
      const page = await context.newPage();
      openedPages.push(page);
      await page.goto(`/?clientId=${clientId}&sessionId=${sessionId}`);
      const g = new GameTester(page, "HOST");
      await g.waitForBattle();
      return g;
    });
    for (const p of openedPages) {
      await p.context().close();
    }
  },

  openGuest: async ({ browser }, use) => {
    const openedPages: Page[] = [];
    await use(async (sessionId: string, clientId: string) => {
      const context = await browser.newContext();
      const page = await context.newPage();
      openedPages.push(page);
      await page.goto(`/?clientId=${clientId}&sessionId=${sessionId}`);
      const g = new GameTester(page, "GUEST");
      await g.waitForBattle();
      return g;
    });
    for (const p of openedPages) {
      await p.context().close();
    }
  },
});

export { expect } from "@playwright/test";
