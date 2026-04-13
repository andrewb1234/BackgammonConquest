import { useGameStore } from "../store/useGameStore";

export default function WaitingView() {
  const sectorCode = useGameStore((s) => s.sectorCode);

  return (
    <div className="flex flex-col items-center gap-6">
      <h2 className="text-2xl font-bold text-amber-400">Awaiting Opponent</h2>
      <p className="text-gray-400">Share this Sector Code with your opponent:</p>
      <div className="bg-gray-800 border-2 border-amber-600 rounded-lg px-8 py-4">
        <span className="text-3xl font-mono tracking-[0.4em] text-green-400">
          {sectorCode}
        </span>
      </div>
      <div className="flex items-center gap-2 text-gray-500">
        <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
        <span className="text-sm">Waiting for connection...</span>
      </div>
    </div>
  );
}
