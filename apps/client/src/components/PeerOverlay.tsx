import { useGameStore } from "../store/useGameStore";

export default function PeerOverlay() {
  const peerDisconnected = useGameStore((s) => s.peerDisconnected);

  if (!peerDisconnected) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-red-700 rounded-lg p-8 flex flex-col items-center gap-4">
        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
        <h3 className="text-xl font-bold text-red-400">Opponent Disconnected</h3>
        <p className="text-gray-400 text-sm">Waiting for reconnection...</p>
      </div>
    </div>
  );
}
