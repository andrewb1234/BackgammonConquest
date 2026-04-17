import type { BoardState, PlayerRole, Point } from "@backgammon-conquest/shared";

interface TacticalBoardProps {
  board: BoardState;
  myRole: PlayerRole | undefined;
  isMyTurn: boolean;
  dice: number[] | null;
  selectedPoint: number | "BAR" | null;
  validTargets: Set<number>;
  targetingItem: string | null;
  onPointClick: (idx: number | "BAR") => void;
  onTargetClick: (idx: number) => void;
}

/**
 * Holographic tactical table — traditional backgammon U-shape split by the Void-Buffer.
 * Top row (left→right): 12..17 | BAR | 18..23
 * Bottom row (left→right): 11..6 | BAR | 5..0
 * Fully responsive; points scale via CSS grid.
 */
export default function TacticalBoard({
  board,
  myRole,
  isMyTurn,
  dice,
  selectedPoint,
  validTargets,
  targetingItem,
  onPointClick,
  onTargetClick,
}: TacticalBoardProps) {
  const points = board.points;
  const bars = board.bars;
  const borneOff = board.borneOff;

  const topLeft = [12, 13, 14, 15, 16, 17];
  const topRight = [18, 19, 20, 21, 22, 23];
  const bottomLeft = [11, 10, 9, 8, 7, 6];
  const bottomRight = [5, 4, 3, 2, 1, 0];

  const isItemTarget = (p: Point) =>
    !!targetingItem &&
    p.count > 0 &&
    ((targetingItem === "AIR_STRIKE" && p.owner && p.owner !== myRole && p.count === 1) ||
      (targetingItem === "ANGELIC_PROTECTION" && p.owner === myRole));

  const renderTriangleRow = (indices: number[], isTop: boolean) =>
    indices.map((idx, i) => {
      const p = points[idx];
      const isLight = (i + (isTop ? 0 : 1)) % 2 === 0;
      const isSelected = selectedPoint === idx;
      const isValid = validTargets.has(idx);
      const canSelect = isMyTurn && !!dice && p.owner === myRole && p.count > 0;
      const itemTarget = isItemTarget(p);

      return (
        <TriangularPoint
          key={idx}
          point={p}
          index={idx}
          isTop={isTop}
          isLight={isLight}
          isSelected={isSelected}
          isValidTarget={isValid}
          isItemTarget={itemTarget}
          canSelect={canSelect}
          onClick={() => onPointClick(idx)}
          onTargetClick={() => onTargetClick(idx)}
        />
      );
    });

  return (
    <div className="metal-frame crt-scanlines border-2 rounded-lg p-2 sm:p-3 w-full">
      <div className="holo-surface rounded border border-amber-900/40 p-1 sm:p-2">
        {/* GUEST bearing-off indicator (top row, shown only to GUEST) */}
        <div className="flex justify-end text-[9px] sm:text-[10px] font-mono text-amber-400/70 crt-glow px-1 mb-1 uppercase tracking-widest">
          <span>Orbital Evac (GUEST) {borneOff.GUEST}/15</span>
        </div>

        {/* TOP ROW: points 12-23 (opponent's side from HOST perspective) */}
        <div className="grid grid-cols-[repeat(6,minmax(0,1fr))_auto_repeat(6,minmax(0,1fr))] gap-0 items-stretch">
          {renderTriangleRow(topLeft, true)}
          <BarColumn
            bars={bars}
            myRole={myRole}
            isTop
            selected={selectedPoint === "BAR"}
            onClick={() => myRole && bars[myRole] > 0 && onPointClick("BAR")}
          />
          {renderTriangleRow(topRight, true)}
        </div>

        {/* Mid-board ribbon (faction marker / divider) */}
        <div className="h-2 my-1 bg-gradient-to-r from-transparent via-amber-900/30 to-transparent" />

        {/* BOTTOM ROW: points 0-11 (HOST side from HOST perspective) */}
        <div className="grid grid-cols-[repeat(6,minmax(0,1fr))_auto_repeat(6,minmax(0,1fr))] gap-0 items-stretch">
          {renderTriangleRow(bottomLeft, false)}
          <BarColumn
            bars={bars}
            myRole={myRole}
            isTop={false}
            selected={selectedPoint === "BAR"}
            onClick={() => myRole && bars[myRole] > 0 && onPointClick("BAR")}
          />
          {renderTriangleRow(bottomRight, false)}
        </div>

        {/* HOST bearing-off indicator */}
        <div className="flex justify-start text-[9px] sm:text-[10px] font-mono text-red-400/70 crt-glow px-1 mt-1 uppercase tracking-widest">
          <span>Orbital Evac (HOST) {borneOff.HOST}/15</span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------
// BAR COLUMN (Void-Buffer)
// ---------------------------------------------------------

function BarColumn({
  bars,
  myRole,
  isTop,
  selected,
  onClick,
}: {
  bars: { HOST: number; GUEST: number };
  myRole: PlayerRole | undefined;
  isTop: boolean;
  selected: boolean;
  onClick: () => void;
}) {
  const count = myRole ? bars[myRole] : 0;
  const hasPieces = count > 0;
  const isHost = myRole === "HOST";

  // Show opponent's bar count on top; player's bar count on bottom
  const showOwnHere = (isTop && !isHost) || (!isTop && isHost);
  const displayCount = showOwnHere ? count : (myRole ? bars[isHost ? "GUEST" : "HOST"] : 0);
  const displayIsMine = showOwnHere && hasPieces;

  return (
    <div
      onClick={displayIsMine ? onClick : undefined}
      className={`
        flex flex-col items-center justify-center
        min-w-[20px] sm:min-w-[28px] px-1
        border-x border-amber-900/50
        ${displayIsMine ? "cursor-pointer" : ""}
        ${selected && displayIsMine ? "crt-pulse rounded" : ""}
      `}
      title="Void-Buffer (Bar)"
    >
      {displayCount > 0 && (
        <div
          className={`
            w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center
            text-[9px] sm:text-[10px] font-bold
            ${(showOwnHere ? isHost : !isHost) ? "legion-host text-red-100" : "legion-guest text-amber-950"}
          `}
        >
          {displayCount}
        </div>
      )}
      <div className="text-[7px] sm:text-[8px] font-mono text-amber-600/60 tracking-widest uppercase mt-1">
        {isTop ? "▲" : "▼"}
      </div>
    </div>
  );
}

// ---------------------------------------------------------
// TRIANGULAR POINT (a single "trench")
// ---------------------------------------------------------

function TriangularPoint({
  point,
  index,
  isTop,
  isLight,
  isSelected,
  isValidTarget,
  isItemTarget,
  canSelect,
  onClick,
  onTargetClick,
}: {
  point: Point;
  index: number;
  isTop: boolean;
  isLight: boolean;
  isSelected: boolean;
  isValidTarget: boolean;
  isItemTarget: boolean;
  canSelect: boolean;
  onClick: () => void;
  onTargetClick: () => void;
}) {
  const hasPieces = point.count > 0;
  const trenchClass = isLight ? "trench-light" : "trench-dark";
  const ownerClass = point.owner === "HOST" ? "legion-host" : point.owner === "GUEST" ? "legion-guest" : "";
  const isProtected = point.activeEffects && point.activeEffects.length > 0;

  // Cap visible stack to 5; overflow shown as badge
  const visibleStack = Math.min(point.count, 5);
  const overflow = point.count - visibleStack;

  // Triangle uses clip-path for the "trench" shape
  const trianglePath = isTop
    ? "polygon(0% 0%, 100% 0%, 50% 100%)"
    : "polygon(0% 100%, 100% 100%, 50% 0%)";

  const handleClick = () => {
    if (isItemTarget) onClick(); // item targeting uses onClick
    else if (isValidTarget) onTargetClick();
    else if (canSelect) onClick();
  };

  const clickable = canSelect || isValidTarget || isItemTarget;

  return (
    <div
      onClick={clickable ? handleClick : undefined}
      className={`
        relative flex flex-col items-center min-h-[80px] sm:min-h-[120px] md:min-h-[150px]
        ${isTop ? "justify-start" : "justify-end"}
        ${clickable ? "cursor-pointer" : ""}
        ${isSelected ? "crt-pulse rounded" : ""}
        transition
      `}
    >
      {/* Triangle trench backdrop */}
      <div
        className={`absolute inset-0 ${trenchClass} ${isValidTarget ? "ring-2 ring-green-400 ring-inset" : ""} ${isItemTarget ? "ring-2 ring-amber-400 ring-inset" : ""}`}
        style={{ clipPath: trianglePath }}
      />

      {/* Pieces stack — vertical, overlapping slightly */}
      <div className={`relative z-10 flex flex-col items-center ${isTop ? "pt-1" : "pb-1"} ${isTop ? "" : "flex-col-reverse"}`}>
        {hasPieces && (
          <>
            {Array.from({ length: visibleStack }).map((_, i) => (
              <div
                key={i}
                className={`
                  w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 rounded-full ${ownerClass}
                  ${i > 0 ? "-mt-1 sm:-mt-2" : ""}
                `}
              />
            ))}
            {overflow > 0 && (
              <span
                className={`
                  text-[9px] sm:text-[10px] font-mono font-bold mt-0.5 crt-glow
                  ${point.owner === "HOST" ? "text-red-300" : "text-amber-200"}
                `}
              >
                +{overflow}
              </span>
            )}
            {isProtected && (
              <span
                className="absolute -top-1 -right-1 text-[9px] sm:text-[10px] text-cyan-300 crt-glow-green animate-pulse"
                title="Angelic Protection active"
              >
                🛡
              </span>
            )}
          </>
        )}
      </div>

      {/* Point number label — bottom for top row, top for bottom row */}
      <span
        className={`
          absolute ${isTop ? "bottom-0" : "top-0"} left-1/2 -translate-x-1/2
          text-[8px] sm:text-[9px] font-mono text-amber-600/70 crt-glow
        `}
      >
        {index + 1}
      </span>
    </div>
  );
}
