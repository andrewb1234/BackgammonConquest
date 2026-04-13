import { useGameStore } from "../store/useGameStore";
import type { PlayerRole } from "@backgammon-conquest/shared";

export default function CampaignResultView() {
  const gameState = useGameStore((s) => s.gameState);
  const clientId = useGameStore((s) => s.clientId);
  const reset = useGameStore((s) => s.reset);

  const winner = gameState?.campaignWinner ?? null;
  const myRole = gameState?.players.find((p) => p.playerId === clientId)?.role as PlayerRole | undefined;
  const isVictor = winner === myRole;
  const factionName = winner === "HOST" ? "Iron Hegemony" : winner === "GUEST" ? "Solar Covenant" : "Unknown";

  return (
    <div className="flex flex-col items-center gap-8">
      <h2 className="text-3xl font-bold text-amber-400">Campaign Concluded</h2>

      <div className={`text-center p-8 rounded-lg border-2 ${isVictor ? "border-green-500 bg-green-900/30" : "border-red-500 bg-red-900/30"}`}>
        <p className="text-5xl font-bold mb-4">
          {isVictor ? "Galactic Supremacy" : "Total Defeat"}
        </p>
        <p className="text-xl text-gray-300">
          {winner ? `The ${factionName} has conquered the sector` : "The campaign has ended"}
        </p>
        {winner && (
          <p className="text-sm text-gray-500 mt-2">
            Capital node captured — enemy stronghold fallen
          </p>
        )}
      </div>

      {/* Final campaign map state */}
      <div className="flex gap-3 items-center">
        {gameState?.campaign.nodes.map((node) => (
          <div
            key={node.nodeId}
            className={`w-12 h-12 rounded border-2 flex flex-col items-center justify-center text-[10px] font-bold
              ${node.owner === "HOST" ? "border-red-700 bg-red-900/20 text-red-400" : ""}
              ${node.owner === "GUEST" ? "border-yellow-600 bg-yellow-900/20 text-yellow-400" : ""}
              ${node.owner === "NEUTRAL" ? "border-gray-600 bg-gray-800 text-gray-400" : ""}
            `}
          >
            <span>N{node.nodeId + 1}</span>
          </div>
        ))}
      </div>

      <button
        onClick={reset}
        className="px-6 py-3 bg-amber-600 hover:bg-amber-500 rounded font-bold transition"
      >
        Return to Lobby
      </button>
    </div>
  );
}
