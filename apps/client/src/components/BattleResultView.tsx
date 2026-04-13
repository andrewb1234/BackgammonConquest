import { useEffect } from "react";
import { useGameStore } from "../store/useGameStore";
import type { PlayerRole } from "@backgammon-conquest/shared";
import { playVictory, playDefeat } from "../services/sounds";

export default function BattleResultView() {
  const gameState = useGameStore((s) => s.gameState);
  const clientId = useGameStore((s) => s.clientId);
  const sendGameIntent = useGameStore((s) => s.sendGameIntent);

  const battle = gameState?.battle;
  const borneOff = battle?.board.borneOff;
  const contestedNodeId = battle?.contestedNodeId ?? -1;

  // Determine battle winner from borneOff counts
  let winner: PlayerRole | null = null;
  if (borneOff) {
    if (borneOff.HOST === 15) winner = "HOST";
    else if (borneOff.GUEST === 15) winner = "GUEST";
  }

  // If campaignWinner is set, it's a forfeit or campaign-level result
  if (gameState?.campaignWinner) {
    winner = gameState.campaignWinner;
  }

  const myRole = gameState?.players.find((p) => p.playerId === clientId)?.role as PlayerRole | undefined;
  const myPlayer = gameState?.players.find((p) => p.playerId === clientId);
  const isVictor = winner === myRole;
  const factionName = winner === "HOST" ? "Iron Hegemony" : winner === "GUEST" ? "Solar Covenant" : "Unknown";

  // Play victory/defeat sound on mount
  useEffect(() => {
    if (winner && myRole) {
      isVictor ? playVictory() : playDefeat();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col items-center gap-6">
      <h2 className="text-2xl font-bold text-amber-400">Battle Resolution</h2>

      <div className={`text-center p-6 rounded-lg border-2 transition-all duration-500 ${isVictor ? "border-green-600 bg-green-900/20 scale-100" : "border-red-600 bg-red-900/20 scale-95"}`}>
        <p className={`text-4xl font-bold mb-2 ${isVictor ? "animate-pulse" : ""}`}>
          {isVictor ? "Victory" : "Defeat"}
        </p>
        <p className="text-gray-400">
          {winner ? `${factionName} has claimed Node ${contestedNodeId + 1}` : "Battle concluded"}
        </p>
      </div>

      {borneOff && (
        <div className="flex gap-8 text-sm">
          <div className="text-red-400">
            Iron Hegemony Orbital Evacuation: {borneOff.HOST}/15
          </div>
          <div className="text-yellow-400">
            Solar Covenant Orbital Evacuation: {borneOff.GUEST}/15
          </div>
        </div>
      )}

      {myPlayer && (
        <div className="text-sm text-amber-300">
          Void-Scrap: {myPlayer.voidScrap}
        </div>
      )}

      <button
        onClick={() => sendGameIntent("ACKNOWLEDGE_RESULT", {})}
        className="px-6 py-3 bg-amber-600 hover:bg-amber-500 rounded font-bold transition"
      >
        Acknowledge Result
      </button>
    </div>
  );
}
