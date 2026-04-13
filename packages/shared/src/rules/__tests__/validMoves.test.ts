import { describe, it, expect } from "vitest";
import { getValidMoves, applyMove, hasAnyValidMove } from "../validMoves.js";
import { createInitialBoard, isAllInHomeBoard } from "../boardSetup.js";
import type { BoardState } from "../../state/index.js";
import type { ValidMove } from "../validMoves.js";

describe("getValidMoves", () => {
  it("returns moves for a simple die roll", () => {
    const board = createInitialBoard();
    const dice = [3, 5];
    const diceUsed = [false, false];
    const moves = getValidMoves(board, "HOST", dice, diceUsed);
    // HOST at point 5 can move to 2 (die=3) or 0 (die=5)
    expect(moves.length).toBeGreaterThan(0);
  });

  it("returns bar entry moves when on bar", () => {
    const board = createInitialBoard();
    board.bars.HOST = 1;
    board.points[12].count = 0;
    board.points[12].owner = null;
    const dice = [3, 5];
    const diceUsed = [false, false];
    const moves = getValidMoves(board, "HOST", dice, diceUsed);
    // HOST enters from bar: 24-3=21, 24-5=19
    const barMoves = moves.filter((m) => m.fromPoint === "BAR");
    expect(barMoves.length).toBe(2);
    expect(barMoves.map((m) => m.toPoint)).toContain(21);
    expect(barMoves.map((m) => m.toPoint)).toContain(19);
  });

  it("returns only bar entry moves when on bar (no other moves)", () => {
    const board = createInitialBoard();
    board.bars.HOST = 1;
    const dice = [3, 5];
    const diceUsed = [false, false];
    const moves = getValidMoves(board, "HOST", dice, diceUsed);
    const nonBarMoves = moves.filter((m) => m.fromPoint !== "BAR");
    expect(nonBarMoves.length).toBe(0);
  });

  it("skips used dice", () => {
    const board = createInitialBoard();
    const dice = [3, 5];
    const diceUsed = [true, false]; // die 3 used
    const moves = getValidMoves(board, "HOST", dice, diceUsed);
    // Should only generate moves for die=5
    expect(moves.every((m) => m.dieUsed === 5)).toBe(true);
  });

  it("includes bearing off moves when all in home board", () => {
    const board: BoardState = {
      points: Array.from({ length: 24 }, () => ({ owner: null, count: 0, activeEffects: [] })),
      bars: { HOST: 0, GUEST: 0 },
      borneOff: { HOST: 10, GUEST: 0 },
    };
    // HOST home = 0-5, place 5 pieces
    board.points[5] = { owner: "HOST", count: 3, activeEffects: [] };
    board.points[3] = { owner: "HOST", count: 2, activeEffects: [] };
    expect(isAllInHomeBoard(board, "HOST")).toBe(true);

    const dice = [6, 1];
    const diceUsed = [false, false];
    const moves = getValidMoves(board, "HOST", dice, diceUsed);
    const bearOffMoves = moves.filter((m) => m.isBearingOff);
    expect(bearOffMoves.length).toBeGreaterThan(0);
  });

  it("allows hitting a single opponent piece", () => {
    const board: BoardState = {
      points: Array.from({ length: 24 }, () => ({ owner: null, count: 0, activeEffects: [] })),
      bars: { HOST: 0, GUEST: 0 },
      borneOff: { HOST: 0, GUEST: 0 },
    };
    board.points[5] = { owner: "HOST", count: 1, activeEffects: [] };
    board.points[2] = { owner: "GUEST", count: 1, activeEffects: [] }; // single opponent
    const dice = [3, 5];
    const diceUsed = [false, false];
    const moves = getValidMoves(board, "HOST", dice, diceUsed);
    const hitMove = moves.find((m) => m.fromPoint === 5 && m.toPoint === 2);
    expect(hitMove).toBeDefined();
  });

  it("blocks landing on 2+ opponent pieces", () => {
    const board: BoardState = {
      points: Array.from({ length: 24 }, () => ({ owner: null, count: 0, activeEffects: [] })),
      bars: { HOST: 0, GUEST: 0 },
      borneOff: { HOST: 0, GUEST: 0 },
    };
    board.points[5] = { owner: "HOST", count: 1, activeEffects: [] };
    board.points[2] = { owner: "GUEST", count: 2, activeEffects: [] }; // blocked
    const dice = [3, 5];
    const diceUsed = [false, false];
    const moves = getValidMoves(board, "HOST", dice, diceUsed);
    const blockedMove = moves.find((m) => m.fromPoint === 5 && m.toPoint === 2);
    expect(blockedMove).toBeUndefined();
  });
});

describe("applyMove", () => {
  it("moves a piece from one point to another", () => {
    const board = createInitialBoard();
    const move: ValidMove = { fromPoint: 5, toPoint: 2, dieUsed: 3, isBearingOff: false };
    const result = applyMove(board, "HOST", move);
    expect(result.board.points[5].count).toBe(4); // was 5, now 4
    expect(result.board.points[2].owner).toBe("HOST");
    expect(result.board.points[2].count).toBe(1);
    expect(result.hit).toBe(false);
  });

  it("sends hit opponent to bar", () => {
    const board: BoardState = {
      points: Array.from({ length: 24 }, () => ({ owner: null, count: 0, activeEffects: [] })),
      bars: { HOST: 0, GUEST: 0 },
      borneOff: { HOST: 0, GUEST: 0 },
    };
    board.points[5] = { owner: "HOST", count: 2, activeEffects: [] };
    board.points[2] = { owner: "GUEST", count: 1, activeEffects: [] };
    const move: ValidMove = { fromPoint: 5, toPoint: 2, dieUsed: 3, isBearingOff: false };
    const result = applyMove(board, "HOST", move);
    expect(result.hit).toBe(true);
    expect(result.board.bars.GUEST).toBe(1);
    expect(result.board.points[2].owner).toBe("HOST");
    expect(result.board.points[2].count).toBe(1);
  });

  it("enters from bar", () => {
    const board: BoardState = {
      points: Array.from({ length: 24 }, () => ({ owner: null, count: 0, activeEffects: [] })),
      bars: { HOST: 1, GUEST: 0 },
      borneOff: { HOST: 0, GUEST: 0 },
    };
    const move: ValidMove = { fromPoint: "BAR", toPoint: 21, dieUsed: 3, isBearingOff: false };
    const result = applyMove(board, "HOST", move);
    expect(result.board.bars.HOST).toBe(0);
    expect(result.board.points[21].owner).toBe("HOST");
    expect(result.board.points[21].count).toBe(1);
  });

  it("bears off a piece", () => {
    const board: BoardState = {
      points: Array.from({ length: 24 }, () => ({ owner: null, count: 0, activeEffects: [] })),
      bars: { HOST: 0, GUEST: 0 },
      borneOff: { HOST: 0, GUEST: 0 },
    };
    board.points[5] = { owner: "HOST", count: 1, activeEffects: [] };
    const move: ValidMove = { fromPoint: 5, toPoint: -1, dieUsed: 6, isBearingOff: true };
    const result = applyMove(board, "HOST", move);
    expect(result.board.borneOff.HOST).toBe(1);
    expect(result.board.points[5].count).toBe(0);
    expect(result.board.points[5].owner).toBeNull();
  });
});

describe("hasAnyValidMove", () => {
  it("returns true when moves exist", () => {
    const board = createInitialBoard();
    const dice = [3, 5];
    const diceUsed = [false, false];
    expect(hasAnyValidMove(board, "HOST", dice, diceUsed)).toBe(true);
  });

  it("returns false when blocked", () => {
    const board: BoardState = {
      points: Array.from({ length: 24 }, () => ({ owner: null, count: 0, activeEffects: [] })),
      bars: { HOST: 1, GUEST: 0 },
      borneOff: { HOST: 0, GUEST: 0 },
    };
    // Block all entry points for HOST with die=3 (21) and die=5 (19)
    board.points[21] = { owner: "GUEST", count: 2, activeEffects: [] };
    board.points[19] = { owner: "GUEST", count: 2, activeEffects: [] };
    const dice = [3, 5];
    const diceUsed = [false, false];
    expect(hasAnyValidMove(board, "HOST", dice, diceUsed)).toBe(false);
  });
});

describe("Angelic Protection", () => {
  it("blocks enemy from hitting a protected blot", () => {
    const board: BoardState = {
      points: Array.from({ length: 24 }, () => ({ owner: null, count: 0, activeEffects: [] })),
      bars: { HOST: 0, GUEST: 0 },
      borneOff: { HOST: 0, GUEST: 0 },
    };
    board.points[5] = { owner: "HOST", count: 1, activeEffects: [] };
    board.points[2] = {
      owner: "GUEST",
      count: 1,
      activeEffects: [{ effectId: "ANGELIC_PROTECTION", duration: 2, expiresOnTurn: 5, sourcePlayerId: "guest" }],
    };
    const dice = [3, 5];
    const diceUsed = [false, false];
    const moves = getValidMoves(board, "HOST", dice, diceUsed);
    const hitMove = moves.find((m) => m.fromPoint === 5 && m.toPoint === 2);
    expect(hitMove).toBeUndefined();
  });

  it("allows hitting an unprotected blot", () => {
    const board: BoardState = {
      points: Array.from({ length: 24 }, () => ({ owner: null, count: 0, activeEffects: [] })),
      bars: { HOST: 0, GUEST: 0 },
      borneOff: { HOST: 0, GUEST: 0 },
    };
    board.points[5] = { owner: "HOST", count: 1, activeEffects: [] };
    board.points[2] = { owner: "GUEST", count: 1, activeEffects: [] };
    const dice = [3, 5];
    const diceUsed = [false, false];
    const moves = getValidMoves(board, "HOST", dice, diceUsed);
    const hitMove = moves.find((m) => m.fromPoint === 5 && m.toPoint === 2);
    expect(hitMove).toBeDefined();
  });
});
