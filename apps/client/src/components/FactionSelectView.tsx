import { useGameStore } from "../store/useGameStore";
import type { Faction } from "@backgammon-conquest/shared";

export default function FactionSelectView() {
  const gameState = useGameStore((s) => s.gameState);
  const clientId = useGameStore((s) => s.clientId);
  const lockFaction = useGameStore((s) => s.lockFaction);
  const lastRejection = useGameStore((s) => s.lastRejection);

  const myPlayer = gameState?.players.find((p) => p.playerId === clientId);
  const otherPlayer = gameState?.players.find((p) => p.playerId !== clientId);
  const myFaction = myPlayer?.faction ?? null;
  const otherFaction = otherPlayer?.faction ?? null;

  const factions: { id: Faction; label: string; color: string; desc: string }[] = [
    {
      id: "IRON_HEGEMONY",
      label: "Iron Hegemony",
      color: "border-red-700 hover:bg-red-900/30",
      desc: "Rust-red, heavy gear-like legions",
    },
    {
      id: "SOLAR_COVENANT",
      label: "Solar Covenant",
      color: "border-yellow-600 hover:bg-yellow-900/30",
      desc: "Gold & marble-white, glowing auras",
    },
  ];

  return (
    <div className="flex flex-col items-center gap-6">
      <h2 className="text-2xl font-bold text-amber-400">Select Your Faction</h2>

      <div className="flex gap-6">
        {factions.map((f) => {
          const isTaken = otherFaction === f.id;
          const isSelected = myFaction === f.id;

          return (
            <button
              key={f.id}
              onClick={() => !isTaken && lockFaction(f.id)}
              disabled={isTaken}
              className={`
                w-56 p-6 rounded-lg border-2 transition flex flex-col items-center gap-3
                ${isSelected ? f.color + " ring-2 ring-amber-400" : f.color}
                ${isTaken ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}
              `}
            >
              <span className="text-xl font-bold">{f.label}</span>
              <span className="text-xs text-gray-400">{f.desc}</span>
              {isSelected && <span className="text-green-400 text-sm font-bold">✓ Locked In</span>}
              {isTaken && <span className="text-red-400 text-sm">Taken by opponent</span>}
            </button>
          );
        })}
      </div>

      {lastRejection && (
        <p className="text-red-400 text-sm">
          Rejected: {lastRejection.reason}
        </p>
      )}

      {myFaction && !otherFaction && (
        <div className="flex items-center gap-2 text-gray-500">
          <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
          <span className="text-sm">Waiting for opponent to select faction...</span>
        </div>
      )}
    </div>
  );
}
