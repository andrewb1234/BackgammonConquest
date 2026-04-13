import { useGameStore } from "../store/useGameStore";

export default function CampaignMapView() {
  const gameState = useGameStore((s) => s.gameState);
  const clientId = useGameStore((s) => s.clientId);
  const sendGameIntent = useGameStore((s) => s.sendGameIntent);

  const nodes = gameState?.campaign.nodes ?? [];
  const activePlayerId = gameState?.campaign.activePlayerId ?? "";
  const isActive = activePlayerId === clientId;

  return (
    <div className="flex flex-col items-center gap-6">
      <h2 className="text-2xl font-bold text-amber-400">Campaign Map</h2>
      <p className="text-gray-400 text-sm">
        {isActive ? "Your turn — select a node to attack" : "Opponent's turn — waiting..."}
      </p>

      <div className="flex gap-3 items-center">
        {nodes.map((node) => (
          <button
            key={node.nodeId}
            onClick={() => {
              if (isActive && node.owner !== clientId) {
                sendGameIntent("TARGET_NODE", { nodeId: node.nodeId });
              }
            }}
            disabled={!isActive || node.owner === clientId}
            className={`
              w-16 h-16 rounded-lg border-2 flex flex-col items-center justify-center text-xs font-bold transition
              ${node.owner === "HOST" ? "border-red-700 bg-red-900/20 text-red-400" : ""}
              ${node.owner === "GUEST" ? "border-yellow-600 bg-yellow-900/20 text-yellow-400" : ""}
              ${node.owner === "NEUTRAL" ? "border-gray-600 bg-gray-800 text-gray-400" : ""}
              ${isActive && node.owner !== clientId ? "hover:ring-2 hover:ring-amber-400 cursor-pointer" : "opacity-60"}
            `}
          >
            <span>N{node.nodeId + 1}</span>
            <span className="text-[10px]">{node.owner}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
