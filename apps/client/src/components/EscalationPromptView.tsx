import { useGameStore } from "../store/useGameStore";
import type { PlayerRole } from "@backgammon-conquest/shared";

export default function EscalationPromptView() {
  const gameState = useGameStore((s) => s.gameState);
  const clientId = useGameStore((s) => s.clientId);
  const sendGameIntent = useGameStore((s) => s.sendGameIntent);

  const escalation = gameState?.battle?.escalation;
  const myRole = gameState?.players.find((p) => p.playerId === clientId)?.role as PlayerRole | undefined;
  const isController = escalation?.controllerPlayerId === clientId;
  const isResponder = !isController;

  const currentMultiplier = escalation?.multiplier ?? 1;
  const nextMultiplier = currentMultiplier * 2;

  const invokerRole: PlayerRole = isController ? myRole! : (myRole === "HOST" ? "GUEST" : "HOST");
  const invokerFaction = invokerRole === "HOST" ? "Iron Hegemony" : "Solar Covenant";

  return (
    <div className="flex flex-col items-center gap-6">
      <h2 className="text-2xl font-bold text-red-400">⚠ Escalation Protocol</h2>

      <div className="text-center p-6 rounded-lg border-2 border-red-700 bg-red-900/20 max-w-md">
        <p className="text-lg font-bold mb-2">
          {invokerFaction} invokes escalation!
        </p>
        <p className="text-gray-300">
          Current stakes: <span className="text-amber-400 font-bold">{currentMultiplier}×</span>
        </p>
        <p className="text-gray-300">
          If accepted: <span className="text-red-400 font-bold">{nextMultiplier}×</span>
        </p>
      </div>

      {isController && (
        <div className="text-center text-gray-400">
          <p>You invoked escalation. Waiting for opponent's response...</p>
        </div>
      )}

      {isResponder && (
        <div className="flex gap-4">
          <button
            onClick={() => sendGameIntent("INTENT_RESPOND_ESCALATION", { response: "ACCEPT" })}
            className="px-6 py-3 bg-red-700 hover:bg-red-600 rounded font-bold transition"
          >
            Accept ({nextMultiplier}× stakes)
          </button>
          <button
            onClick={() => sendGameIntent("INTENT_RESPOND_ESCALATION", { response: "RETREAT" })}
            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded font-bold transition"
          >
            Retreat (forfeit node)
          </button>
        </div>
      )}

      <p className="text-xs text-gray-500 max-w-sm text-center">
        Accepting doubles the stakes and transfers escalation control to you.
        Retreating ends the battle — the invoker claims the contested node.
      </p>
    </div>
  );
}
