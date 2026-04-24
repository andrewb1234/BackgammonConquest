import { useGameStore } from "../store/useGameStore";
import type { Faction } from "@backgammon-conquest/shared";

/**
 * FactionSelectView — Allegiance selector.
 *
 * Per §7.3 — two mirrored hero panels, one per faction. Each panel glows in
 * its faction palette (rust-red vs gold), wears corner brackets, and shows
 * an ambient doctrine readout. The locked-in state is represented by a
 * saturated border + LED indicator, not by text alone.
 */
type FactionConfig = {
  id: Faction;
  label: string;
  doctrine: string;
  stats: Array<[string, string]>;
  accent: string;
  accentBright: string;
  plate: string;
  ringSelected: string;
};

const FACTIONS: FactionConfig[] = [
  {
    id: "IRON_HEGEMONY",
    label: "Iron Hegemony",
    doctrine:
      "Industrial war machine. Rust-red legions grind forward in overwhelming formation.",
    stats: [
      ["DOCTRINE", "SCORCHED_EARTH"],
      ["LEGION_FORM", "HEAVY_GEAR"],
      ["PSI_AFFINITY", "NONE"],
    ],
    accent: "text-red-300",
    accentBright: "text-red-200",
    plate: "rust-plate",
    ringSelected: "ring-red-400",
  },
  {
    id: "SOLAR_COVENANT",
    label: "Solar Covenant",
    doctrine:
      "Zealot order of star-priests. Gold-marble legions bound by luminous wards.",
    stats: [
      ["DOCTRINE", "LUMINOUS_FAITH"],
      ["LEGION_FORM", "MARBLE_AURA"],
      ["PSI_AFFINITY", "HIGH"],
    ],
    accent: "text-amber-200",
    accentBright: "text-tertiary-fixed",
    plate: "brass-plate",
    ringSelected: "ring-amber-300",
  },
];

export default function FactionSelectView() {
  const gameState = useGameStore((s) => s.gameState);
  const clientId = useGameStore((s) => s.clientId);
  const lockFaction = useGameStore((s) => s.lockFaction);
  const lastRejection = useGameStore((s) => s.lastRejection);

  const myPlayer = gameState?.players.find((p) => p.playerId === clientId);
  const otherPlayer = gameState?.players.find((p) => p.playerId !== clientId);
  const myFaction = myPlayer?.faction ?? null;
  const otherFaction = otherPlayer?.faction ?? null;

  return (
    <div
      data-testid="view-faction-select"
      className="relative w-full flex flex-col items-center gap-8 py-6"
    >
      <div className="absolute inset-0 hologram-grid opacity-20 pointer-events-none" />

      <div className="relative z-10 text-center">
        <p className="telemetry-warm mb-2">// ALLEGIANCE PROTOCOL //</p>
        <h2 className="font-headline font-black text-3xl tracking-[0.25em] uppercase text-secondary-container">
          Declare Your Faction
        </h2>
        <p className="font-body text-sm text-on-surface-variant mt-2 max-w-lg mx-auto">
          Lock in a doctrine. Selection is permanent for this sector campaign.
        </p>
      </div>

      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl px-2">
        {FACTIONS.map((f) => {
          const isTaken = otherFaction === f.id;
          const isSelected = myFaction === f.id;
          const disabled = isTaken || !!myFaction;

          return (
            <button
              key={f.id}
              data-testid={`faction-${f.id.toLowerCase()}`}
              data-selected={String(isSelected)}
              data-taken={String(isTaken)}
              onClick={() => !disabled && lockFaction(f.id)}
              disabled={disabled}
              className={`
                relative corner-brackets ${f.accent}
                bg-surface-container border border-outline-variant
                p-6 text-left transition-colors
                ${isSelected ? `ring-2 ${f.ringSelected} ring-offset-2 ring-offset-surface` : ""}
                ${isTaken ? "opacity-40 cursor-not-allowed" : "hover:border-secondary-container cursor-pointer"}
              `}
            >
              <span className="cb-bl" />
              <span className="cb-br" />
              <div className="absolute inset-0 scanline opacity-20 pointer-events-none" />

              <div className={`relative inline-block ${f.plate} chamfer-panel px-2 py-[2px] mb-3`}>
                <span className="font-headline font-black tracking-[0.2em] uppercase text-[10px] text-white/90 crt-glow">
                  {f.id.replace("_", " ")}
                </span>
              </div>

              <h3
                className={`relative font-headline font-black text-2xl uppercase tracking-[0.15em] ${f.accentBright} mb-2`}
              >
                {f.label}
              </h3>

              <p className="relative font-body text-sm text-on-surface-variant mb-4">
                {f.doctrine}
              </p>

              <dl className="relative space-y-1">
                {f.stats.map(([k, v]) => (
                  <div
                    key={k}
                    className="flex justify-between font-label text-[10px] uppercase tracking-[0.2em]"
                  >
                    <dt className="text-on-surface-variant/70">{k}</dt>
                    <dd className={f.accentBright}>{v}</dd>
                  </div>
                ))}
              </dl>

              <div className="relative mt-4 h-5 flex items-center justify-between font-headline uppercase tracking-[0.2em] text-[10px]">
                {isSelected ? (
                  <span className="flex items-center gap-2 text-tertiary">
                    <span className="w-2 h-2 bg-tertiary animate-pulse" />
                    Locked In
                  </span>
                ) : isTaken ? (
                  <span className="text-error">Taken</span>
                ) : (
                  <span className="text-on-surface-variant/60">Tap To Lock</span>
                )}
                <span className="text-on-surface-variant/40">{f.id}</span>
              </div>
            </button>
          );
        })}
      </div>

      {lastRejection && (
        <p className="relative z-10 text-error font-headline uppercase tracking-[0.2em] text-xs">
          Rejected: {lastRejection.reason}
        </p>
      )}

      {myFaction && !otherFaction && (
        <div className="relative z-10 flex items-center gap-2 font-headline uppercase tracking-[0.25em] text-[11px] text-on-surface-variant">
          <span className="w-2 h-2 bg-secondary-container animate-pulse" />
          Awaiting opponent allegiance…
        </div>
      )}
    </div>
  );
}
