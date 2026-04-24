import type { ReactNode } from "react";
import { useGameStore } from "../store/useGameStore";
import type { UIView } from "../store/useGameStore";

/**
 * ArchonShell — canonical operator-console frame per AESTHETIC_NARRATIVE.md §5.1.
 *
 * Renders the fixed top header (title + ambient telemetry + sync status) and
 * the fixed bottom phase-nav ribbon. `children` is the centre stage for the
 * current view. The shell is purely decorative: it reads from the store but
 * never mutates state, so it can wrap any uiView without breaking the state
 * machine.
 */
export default function ArchonShell({ children }: { children: ReactNode }) {
  const uiView = useGameStore((s) => s.uiView);
  const sectorCode = useGameStore((s) => s.sectorCode);
  const gameState = useGameStore((s) => s.gameState);
  const clientId = useGameStore((s) => s.clientId);

  const me = gameState?.players.find((p) => p.playerId === clientId);
  const voidScrap = me?.voidScrap ?? 0;
  const syncPct = gameState ? "100%" : "—";

  return (
    <div
      className="relative h-screen flex flex-col bg-surface text-on-surface font-body overflow-hidden"
    >
      {/* Top header — fixed height inside the flex column. */}
      <header
        className="archon-header z-40 h-14 flex items-center justify-between px-4 sm:px-6 shrink-0"
        data-testid="archon-header"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span
            className="inline-block w-2 h-2 bg-secondary-container"
            aria-hidden
            style={{ boxShadow: "0 0 8px rgba(253,139,0,0.8)" }}
          />
          <span className="font-headline uppercase tracking-[0.2em] text-[11px] sm:text-sm font-black text-secondary-container whitespace-nowrap">
            VOID-GATE · COMMAND ARCHON
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-6">
          <span className="font-headline uppercase tracking-[0.15em] text-[11px] text-on-surface-variant">
            SECTOR: <span className="text-secondary">{sectorCode ?? "—"}</span>
          </span>
          <span className="font-headline uppercase tracking-[0.15em] text-[11px] text-on-surface-variant">
            SCRAP: <span className="text-tertiary">{String(voidScrap).padStart(3, "0")}</span>
          </span>
          <span className="font-headline uppercase tracking-[0.15em] text-[11px] text-secondary border-b border-secondary px-1 py-[2px]">
            SYNC: {syncPct}
          </span>
        </nav>

        <div className="flex items-center gap-3 font-headline uppercase tracking-[0.15em] text-[10px]">
          <span className="border border-outline-variant px-2 py-[2px] text-on-surface-variant">
            {phaseLabel(uiView)}
          </span>
        </div>
      </header>

      {/* Centre stage — flex-grows and scrolls internally so header/footer
          never overlap the view's content. */}
      <main
        className="relative z-10 flex-1 min-h-0 overflow-y-auto flex items-start justify-center"
        data-testid="archon-stage"
      >
        <div className="w-full max-w-5xl px-2 sm:px-4 py-4 sm:py-6">{children}</div>
      </main>

      {/* Bottom phase-nav ribbon — flow element, always at bottom of flex col. */}
      <footer
        className="archon-footer z-40 h-14 flex items-center justify-center gap-2 sm:gap-6 px-4 shrink-0"
        data-testid="archon-footer"
      >
        <PhaseChip label="Lobby" active={isLobbyPhase(uiView)} />
        <PhaseChip label="Campaign" active={uiView === "CAMPAIGN_MAP" || uiView === "CAMPAIGN_RESULT"} />
        <PhaseChip label="Loadout" active={uiView === "LOADOUT"} />
        <PhaseChip label="Battle" active={uiView === "BATTLE_ACTIVE" || uiView === "BATTLE_RESULT"} />
        <PhaseChip label="Escalate" active={uiView === "ESCALATION_PROMPT"} />
      </footer>
    </div>
  );
}

function PhaseChip({ label, active }: { label: string; active: boolean }) {
  return (
    <span
      data-phase={label.toLowerCase()}
      data-active={String(active)}
      className={`flex flex-col items-center justify-center px-3 sm:px-4 py-1 transition-colors font-headline font-bold text-[10px] sm:text-[11px] tracking-[0.2em] uppercase ${
        active
          ? "bg-secondary-container/20 text-secondary border-t-2 border-secondary"
          : "text-on-surface-variant/50 border-t-2 border-transparent"
      }`}
    >
      {label}
    </span>
  );
}

function phaseLabel(v: UIView): string {
  switch (v) {
    case "LOBBY":
      return "Standby";
    case "WAITING":
      return "Link Pending";
    case "FACTION_SELECT":
      return "Allegiance";
    case "CAMPAIGN_MAP":
      return "Sector Brief";
    case "LOADOUT":
      return "Loadout";
    case "BATTLE_ACTIVE":
      return "Engagement";
    case "ESCALATION_PROMPT":
      return "Priority-1";
    case "BATTLE_RESULT":
      return "Debrief";
    case "CAMPAIGN_RESULT":
      return "Endgame";
    default:
      return "—";
  }
}

function isLobbyPhase(v: UIView): boolean {
  return v === "LOBBY" || v === "WAITING" || v === "FACTION_SELECT";
}
