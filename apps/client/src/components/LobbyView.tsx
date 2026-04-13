import { useState } from "react";
import { useGameStore } from "../store/useGameStore";

export default function LobbyView() {
  const createSession = useGameStore((s) => s.createSession);
  const joinSession = useGameStore((s) => s.joinSession);
  const [sectorCode, setSectorCode] = useState("");
  const [mode, setMode] = useState<"choose" | "join">("choose");

  if (mode === "join") {
    return (
      <div className="flex flex-col items-center gap-6">
        <h2 className="text-2xl font-bold text-amber-400">Join Game</h2>
        <p className="text-gray-400 text-sm">Enter the Sector Code provided by the host</p>
        <input
          type="text"
          value={sectorCode}
          onChange={(e) => setSectorCode(e.target.value.toUpperCase())}
          maxLength={6}
          placeholder="SECTOR CODE"
          className="bg-gray-800 border border-gray-600 rounded px-4 py-2 text-center text-xl tracking-[0.3em] text-green-400 placeholder:text-gray-600 focus:outline-none focus:border-amber-500"
        />
        <div className="flex gap-4">
          <button
            onClick={() => setMode("choose")}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-gray-300 transition"
          >
            Back
          </button>
          <button
            onClick={() => {
              if (sectorCode.length === 6) joinSession(sectorCode);
            }}
            disabled={sectorCode.length !== 6}
            className="px-6 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-gray-700 disabled:text-gray-500 rounded font-bold transition"
          >
            Connect
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-8">
      <h1 className="text-5xl font-bold tracking-wider">
        <span className="text-amber-400">BACKGAMMON</span>{" "}
        <span className="text-green-400">CONQUEST</span>
      </h1>
      <p className="text-gray-400 max-w-md text-center">
        A galactic conquest game utilizing Backgammon mechanics for planetary battles.
      </p>
      <div className="flex flex-col gap-4 w-64">
        <button
          onClick={createSession}
          className="px-6 py-3 bg-amber-600 hover:bg-amber-500 rounded font-bold text-lg transition"
        >
          Create Game
        </button>
        <button
          onClick={() => setMode("join")}
          className="px-6 py-3 bg-green-800 hover:bg-green-700 rounded font-bold text-lg transition"
        >
          Join Game
        </button>
      </div>
    </div>
  );
}
