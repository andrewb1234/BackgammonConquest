import { describe, it, expect } from "vitest";
import { createInitialBoard, getDirection, isAllInHomeBoard, isWin } from "../boardSetup.js";
import type { BoardState } from "../../state/index.js";

describe("createInitialBoard", () => {
  it("creates a board with 24 points", () => {
    const board = createInitialBoard();
    expect(board.points).toHaveLength(24);
  });

  it("places 15 pieces per player", () => {
    const board = createInitialBoard();
    const hostCount = board.points.reduce(
      (sum, p) => sum + (p.owner === "HOST" ? p.count : 0), 0
    );
    const guestCount = board.points.reduce(
      (sum, p) => sum + (p.owner === "GUEST" ? p.count : 0), 0
    );
    expect(hostCount).toBe(15);
    expect(guestCount).toBe(15);
  });

  it("starts with empty bars and borneOff", () => {
    const board = createInitialBoard();
    expect(board.bars.HOST).toBe(0);
    expect(board.bars.GUEST).toBe(0);
    expect(board.borneOff.HOST).toBe(0);
    expect(board.borneOff.GUEST).toBe(0);
  });

  it("places HOST pieces at 23(2), 12(5), 7(3), 5(5)", () => {
    const board = createInitialBoard();
    expect(board.points[23]).toEqual({ owner: "HOST", count: 2, activeEffects: [] });
    expect(board.points[12]).toEqual({ owner: "HOST", count: 5, activeEffects: [] });
    expect(board.points[7]).toEqual({ owner: "HOST", count: 3, activeEffects: [] });
    expect(board.points[5]).toEqual({ owner: "HOST", count: 5, activeEffects: [] });
  });

  it("places GUEST pieces at 0(2), 11(5), 16(3), 18(5)", () => {
    const board = createInitialBoard();
    expect(board.points[0]).toEqual({ owner: "GUEST", count: 2, activeEffects: [] });
    expect(board.points[11]).toEqual({ owner: "GUEST", count: 5, activeEffects: [] });
    expect(board.points[16]).toEqual({ owner: "GUEST", count: 3, activeEffects: [] });
    expect(board.points[18]).toEqual({ owner: "GUEST", count: 5, activeEffects: [] });
  });
});

describe("getDirection", () => {
  it("returns -1 for HOST", () => {
    expect(getDirection("HOST")).toBe(-1);
  });

  it("returns +1 for GUEST", () => {
    expect(getDirection("GUEST")).toBe(1);
  });
});

describe("isAllInHomeBoard", () => {
  it("returns false when pieces are outside home board", () => {
    const board = createInitialBoard();
    expect(isAllInHomeBoard(board, "HOST")).toBe(false);
    expect(isAllInHomeBoard(board, "GUEST")).toBe(false);
  });

  it("returns false when pieces are on the bar", () => {
    const board = createInitialBoard();
    board.bars.HOST = 1;
    expect(isAllInHomeBoard(board, "HOST")).toBe(false);
  });

  it("returns true when all pieces are in home board", () => {
    const board: BoardState = {
      points: Array.from({ length: 24 }, () => ({ owner: null, count: 0, activeEffects: [] })),
      bars: { HOST: 0, GUEST: 0 },
      borneOff: { HOST: 10, GUEST: 0 },
    };
    // HOST home = 0-5, put remaining 5 pieces there
    board.points[0] = { owner: "HOST", count: 3, activeEffects: [] };
    board.points[3] = { owner: "HOST", count: 2, activeEffects: [] };
    expect(isAllInHomeBoard(board, "HOST")).toBe(true);
  });
});

describe("isWin", () => {
  it("returns false when not all pieces borne off", () => {
    const board = createInitialBoard();
    expect(isWin(board, "HOST")).toBe(false);
  });

  it("returns true when all 15 pieces borne off", () => {
    const board = createInitialBoard();
    board.borneOff.HOST = 15;
    expect(isWin(board, "HOST")).toBe(true);
  });
});
