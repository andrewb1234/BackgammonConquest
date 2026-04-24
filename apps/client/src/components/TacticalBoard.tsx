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
 *
 * Semantic DOM contract (consumed by Playwright GameTester fixture):
 * - [data-testid="tactical-board"] — root
 * - [data-testid="trench-{0..23}"] — each point, with data-owner/data-count/
 *   data-selectable/data-targetable/data-item-targetable
 * - [data-testid="void-buffer-host"|"void-buffer-guest"] — bar columns with
 *   data-owner/data-count/data-selectable
 * - [data-testid="orbital-evac-host"|"orbital-evac-guest"] — bear-off counters
 *   with data-count
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

  // The top bar column always renders the GUEST bar, the bottom always renders
  // the HOST bar — independent of viewer perspective. This keeps test IDs
  // stable. (See analysis in code comments below.)
  const canSelectBar = (role: PlayerRole) =>
    isMyTurn && !!dice && myRole === role && bars[role] > 0;

  // Bearing off: the rules engine represents bear-off moves as toPoint=-1
  // (HOST) or toPoint=24 (GUEST). When the user has selected a source that
  // offers such a move, validTargets will contain that sentinel — surface
  // it on the orbital-evac indicator as data-targetable so the player (and
  // the Playwright fixture) can click it.
  const hostCanBearOff = validTargets.has(-1);
  const guestCanBearOff = validTargets.has(24);

  return (
    <div
      className="metal-frame crt-scanlines noise-overlay border-2 p-2 sm:p-3 w-full chamfer-panel"
      data-testid="tactical-board"
      data-my-role={myRole ?? ""}
      data-is-my-turn={String(isMyTurn)}
      data-dice={dice ? dice.join(",") : ""}
    >
      <div className="holo-surface border border-amber-900/40 p-1 sm:p-2">
        {/* GUEST Orbital Evac gauge (top row) */}
        <div className="flex justify-end px-1 mb-1">
          <OrbitalEvacPanel
            role="GUEST"
            count={borneOff.GUEST}
            canBearOff={guestCanBearOff}
            onClick={() => onTargetClick(24)}
          />
        </div>

        {/* TOP ROW: points 12-23 */}
        <div className="grid grid-cols-[repeat(6,minmax(0,1fr))_auto_repeat(6,minmax(0,1fr))] gap-0 items-stretch">
          {renderTriangleRow(topLeft, true)}
          <BarColumn
            shownRole="GUEST"
            count={bars.GUEST}
            isTop
            canSelect={canSelectBar("GUEST")}
            selected={selectedPoint === "BAR" && myRole === "GUEST"}
            onClick={() => canSelectBar("GUEST") && onPointClick("BAR")}
          />
          {renderTriangleRow(topRight, true)}
        </div>

        {/* Mid-board ribbon (faction marker / divider) */}
        <div className="h-2 my-1 bg-gradient-to-r from-transparent via-amber-900/30 to-transparent" />

        {/* BOTTOM ROW: points 0-11 */}
        <div className="grid grid-cols-[repeat(6,minmax(0,1fr))_auto_repeat(6,minmax(0,1fr))] gap-0 items-stretch">
          {renderTriangleRow(bottomLeft, false)}
          <BarColumn
            shownRole="HOST"
            count={bars.HOST}
            isTop={false}
            canSelect={canSelectBar("HOST")}
            selected={selectedPoint === "BAR" && myRole === "HOST"}
            onClick={() => canSelectBar("HOST") && onPointClick("BAR")}
          />
          {renderTriangleRow(bottomRight, false)}
        </div>

        {/* HOST Orbital Evac gauge (bottom row) */}
        <div className="flex justify-start px-1 mt-1">
          <OrbitalEvacPanel
            role="HOST"
            count={borneOff.HOST}
            canBearOff={hostCanBearOff}
            onClick={() => onTargetClick(-1)}
          />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------
// ORBITAL EVAC PANEL — segmented industrial progress gauge
// ---------------------------------------------------------

function OrbitalEvacPanel({
  role,
  count,
  canBearOff,
  onClick,
}: {
  role: PlayerRole;
  count: number;
  canBearOff: boolean;
  onClick: () => void;
}) {
  const testId = role === "HOST" ? "orbital-evac-host" : "orbital-evac-guest";
  const plate = role === "HOST" ? "rust-plate" : "brass-plate";
  const activeSeg =
    role === "HOST" ? "gauge-segment-active-host" : "gauge-segment-active-guest";
  const textAccent = role === "HOST" ? "text-red-200" : "text-amber-100";

  // 15 segments, one per legion borne off.
  const segments = Array.from({ length: 15 }, (_, i) => i < count);

  return (
    <div
      data-testid={testId}
      data-count={count}
      data-targetable={String(canBearOff)}
      onClick={canBearOff ? onClick : undefined}
      className={`
        ${plate} chamfer-panel noise-overlay
        flex items-center gap-2 px-2 py-1
        ${canBearOff ? "cursor-pointer ring-2 ring-emerald-400/90" : ""}
      `}
      title={`${role} Orbital Evacuation · ${count}/15`}
    >
      <span
        className={`
          text-[9px] sm:text-[10px] font-mono font-bold tracking-widest uppercase
          ${textAccent} crt-glow whitespace-nowrap
        `}
      >
        EVAC · {role}
      </span>
      <div className="flex items-center gap-[2px]">
        {segments.map((active, i) => (
          <span
            key={i}
            className={`
              inline-block w-[5px] h-3 sm:w-[6px] sm:h-4
              ${active ? activeSeg : "gauge-segment-empty"}
            `}
          />
        ))}
      </div>
      <span
        className={`
          text-[9px] sm:text-[10px] font-mono font-bold tracking-widest
          ${textAccent} crt-glow whitespace-nowrap
        `}
      >
        {String(count).padStart(2, "0")}/15
      </span>
      {canBearOff && (
        <span
          className="led-dot bg-emerald-400 text-emerald-400"
          aria-label="bear-off target available"
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------
// BAR COLUMN (Void-Buffer)
// ---------------------------------------------------------

function BarColumn({
  shownRole,
  count,
  isTop,
  canSelect,
  selected,
  onClick,
}: {
  shownRole: PlayerRole;
  count: number;
  isTop: boolean;
  canSelect: boolean;
  selected: boolean;
  onClick: () => void;
}) {
  const isHost = shownRole === "HOST";
  const testId = isHost ? "void-buffer-host" : "void-buffer-guest";
  const plate = isHost ? "rust-plate" : "brass-plate";
  const legionClass = isHost ? "legion-host" : "legion-guest";

  // Show up to 4 stacked mini-legions, then a sharp chevron `+N` badge.
  const visibleStack = Math.min(count, 4);
  const overflow = count - visibleStack;

  return (
    <div
      onClick={canSelect ? onClick : undefined}
      data-testid={testId}
      data-owner={shownRole}
      data-count={count}
      data-selectable={String(canSelect)}
      className={`
        relative flex flex-col items-center justify-center
        min-w-[22px] sm:min-w-[32px] mx-0.5 my-1 px-1 py-1.5
        ${plate} chamfer-panel noise-overlay
        ${canSelect ? "cursor-pointer ring-1 ring-emerald-400/60" : ""}
        ${selected ? "crt-pulse" : ""}
      `}
      title={`Void-Buffer (${shownRole})`}
    >
      <div className={`flex flex-col items-center ${isTop ? "" : "flex-col-reverse"}`}>
        {count > 0 &&
          Array.from({ length: visibleStack }).map((_, i) => (
            <div
              key={i}
              className={`
                w-4 h-4 sm:w-5 sm:h-5 rounded-full ${legionClass}
                ${i > 0 ? "-mt-1.5 sm:-mt-2" : ""}
              `}
            />
          ))}
        {overflow > 0 && (
          <span
            className={`
              mt-1 px-1 py-[1px] text-[8px] sm:text-[9px] font-mono font-bold
              tracking-widest uppercase leading-none
              ${isHost ? "text-red-100 bg-red-800/90" : "text-amber-100 bg-amber-700/90"}
              overflow-chevron crt-glow
            `}
          >
            +{overflow}
          </span>
        )}
      </div>
      {/* Column label — vertical role tag */}
      <div
        className={`
          absolute ${isTop ? "bottom-0.5" : "top-0.5"} left-1/2 -translate-x-1/2
          text-[7px] sm:text-[8px] font-mono tracking-widest uppercase
          ${isHost ? "text-red-300/70" : "text-amber-300/70"}
        `}
      >
        {isHost ? "H" : "G"}
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

  // Adaptive stack compression:
  //  - ≤5 legions:  show all, standard -2px overlap.
  //  - 6-9:         show 5, tighter -4px overlap, sharp `+N` chevron.
  //  - 10+:         show 4, even tighter -6px overlap, wide `+N` chevron.
  const { visibleStack, overflow, stackStepClass } = (() => {
    if (point.count <= 5) {
      return { visibleStack: point.count, overflow: 0, stackStepClass: "-mt-1 sm:-mt-2" };
    }
    if (point.count <= 9) {
      return { visibleStack: 5, overflow: point.count - 5, stackStepClass: "-mt-2 sm:-mt-3" };
    }
    return { visibleStack: 4, overflow: point.count - 4, stackStepClass: "-mt-3 sm:-mt-4" };
  })();

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

  // Item-target outline color depends on the ambient targetingItem — we don't
  // have that prop here, but the ring color convention is:
  //   - AIR_STRIKE  → red (hostile strike) → .item-target-strike
  //   - ANGELIC_PROTECTION → blue (friendly) → .item-target-protect
  // We inspect the point's owner as a proxy: targeting your own pieces =
  // protect, targeting opponent = strike. Not 100% accurate across all items
  // but visually correct for the two items currently in the game.
  const itemOutlineClass = isItemTarget
    ? point.owner && point.owner === "HOST"
      ? "item-target-protect" // friendly-only view TODO: pipe real targetingItem in
      : "item-target-strike"
    : "";

  return (
    <div
      onClick={clickable ? handleClick : undefined}
      data-testid={`trench-${index}`}
      data-index={index}
      data-owner={point.owner ?? ""}
      data-count={point.count}
      data-selectable={String(canSelect)}
      data-targetable={String(isValidTarget)}
      data-item-targetable={String(isItemTarget)}
      data-selected={String(isSelected)}
      data-protected={String(!!(point.activeEffects && point.activeEffects.length > 0))}
      className={`
        relative flex flex-col items-center min-h-[80px] sm:min-h-[120px] md:min-h-[150px]
        ${isTop ? "justify-start" : "justify-end"}
        ${clickable ? "cursor-pointer" : ""}
        ${isSelected ? "crt-pulse" : ""}
        transition
      `}
    >
      {/* Triangle trench backdrop (clipped) */}
      <div
        className={`
          absolute inset-0 ${trenchClass}
          ${isValidTarget ? "target-valid-ring" : ""}
          ${itemOutlineClass}
        `}
        style={{ clipPath: trianglePath }}
      />

      {/* Pieces stack — vertical, overlapping with adaptive compression */}
      <div
        className={`
          relative z-10 flex flex-col items-center w-full
          ${isTop ? "pt-1" : "pb-1"} ${isTop ? "" : "flex-col-reverse"}
        `}
      >
        {hasPieces && (
          <>
            {Array.from({ length: visibleStack }).map((_, i) => (
              <div
                key={i}
                className={`
                  w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 rounded-full ${ownerClass}
                  ${i > 0 ? stackStepClass : ""}
                `}
              />
            ))}
            {overflow > 0 && (
              <span
                className={`
                  mt-0.5 sm:mt-1 px-1 py-[1px] text-[9px] sm:text-[10px]
                  font-mono font-bold tracking-widest uppercase leading-none
                  ${point.owner === "HOST"
                    ? "bg-red-800/95 text-red-50"
                    : "bg-amber-700/95 text-amber-50"}
                  ${isTop ? "overflow-chevron" : "overflow-chevron-reverse"}
                  crt-glow
                `}
                title={`${point.count} legions total`}
              >
                +{overflow}
              </span>
            )}
            {isProtected && (
              <span
                className="absolute -top-1 right-0 text-[9px] sm:text-[10px] text-cyan-300 crt-glow-green"
                title="Angelic Protection active"
              >
                ▲▲
              </span>
            )}
          </>
        )}
      </div>

      {/* Trench index tag — tiny industrial label anchored to the base */}
      <span
        className={`
          absolute ${isTop ? "bottom-0" : "top-0"} left-1/2 -translate-x-1/2
          text-[8px] sm:text-[9px] font-mono tracking-widest
          text-amber-500/70 crt-glow z-20
        `}
      >
        {String(index + 1).padStart(2, "0")}
      </span>
    </div>
  );
}
