import { useEffect } from "react";
import { useGameStore } from "./store/useGameStore";
import LobbyView from "./components/LobbyView";
import WaitingView from "./components/WaitingView";
import FactionSelectView from "./components/FactionSelectView";
import CampaignMapView from "./components/CampaignMapView";
import PeerOverlay from "./components/PeerOverlay";

function App() {
  const init = useGameStore((s) => s.init);
  const uiView = useGameStore((s) => s.uiView);
  const criticalError = useGameStore((s) => s.criticalError);
  const reset = useGameStore((s) => s.reset);

  useEffect(() => {
    init();
  }, [init]);

  const renderView = () => {
    switch (uiView) {
      case "LOBBY":
        return <LobbyView />;
      case "WAITING":
        return <WaitingView />;
      case "FACTION_SELECT":
        return <FactionSelectView />;
      case "CAMPAIGN_MAP":
        return <CampaignMapView />;
      case "LOADOUT":
        return <PlaceholderView label="Loadout Selection" />;
      case "BATTLE_ACTIVE":
        return <PlaceholderView label="Battle Board" />;
      case "ESCALATION_PROMPT":
        return <PlaceholderView label="Escalation Prompt" />;
      case "BATTLE_RESULT":
        return <PlaceholderView label="Battle Result" />;
      case "CAMPAIGN_RESULT":
        return <PlaceholderView label="Campaign Result" />;
      default:
        return <LobbyView />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      {criticalError && (
        <div className="fixed top-0 inset-x-0 bg-red-900 text-red-200 p-3 text-center z-50">
          <span className="font-bold">Error {criticalError.code}:</span>{" "}
          {criticalError.message}{" "}
          <button onClick={reset} className="underline ml-2">Return to Lobby</button>
        </div>
      )}
      <PeerOverlay />
      {renderView()}
    </div>
  );
}

function PlaceholderView({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-4">
      <h2 className="text-2xl font-bold text-gray-400">{label}</h2>
      <p className="text-gray-600 text-sm">Not yet implemented</p>
    </div>
  );
}

export default App;
