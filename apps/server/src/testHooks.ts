import type { Express, Request, Response } from "express";
import express from "express";
import type { GameState } from "@backgammon-conquest/shared";
import {
  seedSession,
  _resetForTesting,
  _setTestDiceSeed,
  type SeedSessionOptions,
} from "./sessionManager.js";

/**
 * Test-only HTTP hooks for Playwright state injection.
 *
 * Mounted only when `ENABLE_TEST_HOOKS=1`. Provides:
 *   POST /__test__/seed        — inject a partial GameState and obtain IDs
 *   POST /__test__/reset       — clear all in-memory sessions
 *   POST /__test__/dice-seed   — queue deterministic dice values for INTENT_ROLL
 *   GET  /__test__/health      — confirm hooks are active
 *
 * These endpoints must NEVER be enabled in production.
 */

interface SeedRequestBody extends SeedSessionOptions {
  state?: Partial<GameState>;
}

export function registerTestHooks(app: Express): void {
  const router = express.Router();
  router.use(express.json({ limit: "1mb" }));

  router.get("/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", hooks: true });
  });

  router.post("/reset", (_req: Request, res: Response) => {
    _resetForTesting();
    res.json({ status: "ok" });
  });

  router.post("/dice-seed", (req: Request, res: Response) => {
    try {
      const body = (req.body ?? {}) as { dice?: unknown };
      const dice = body.dice;
      if (dice === null || dice === undefined) {
        _setTestDiceSeed(null);
        res.json({ status: "ok", cleared: true });
        return;
      }
      if (!Array.isArray(dice) || !dice.every((d) => Number.isInteger(d) && d >= 1 && d <= 6)) {
        res.status(400).json({ error: "dice must be an array of integers in [1,6]" });
        return;
      }
      if (dice.length % 2 !== 0) {
        res.status(400).json({ error: "dice array length must be even (two dice per roll)" });
        return;
      }
      _setTestDiceSeed([...dice]);
      res.json({ status: "ok", seeded: dice.length });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(400).json({ error: msg });
    }
  });

  router.post("/seed", (req: Request, res: Response) => {
    try {
      const body = (req.body ?? {}) as SeedRequestBody;
      const result = seedSession({
        hostClientId: body.hostClientId,
        guestClientId: body.guestClientId,
        state: body.state,
      });
      res.json({
        sessionId: result.sessionId,
        sectorCode: result.sectorCode,
        hostClientId: result.hostClientId,
        guestClientId: result.guestClientId,
        gameState: result.gameState,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(400).json({ error: msg });
    }
  });

  app.use("/__test__", router);
  console.log(
    "[testHooks] Mounted /__test__ endpoints (ENABLE_TEST_HOOKS is set).",
  );
}
