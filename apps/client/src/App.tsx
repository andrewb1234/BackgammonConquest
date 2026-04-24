import { useEffect } from "react";
import { useGameStore } from "./store/useGameStore";
import LobbyView from "./components/LobbyView";
import WaitingView from "./components/WaitingView";
import FactionSelectView from "./components/FactionSelectView";
import CampaignMapView from "./components/CampaignMapView";
import BattleActiveView from "./components/BattleActiveView";
import BattleResultView from "./components/BattleResultView";
import CampaignResultView from "./components/CampaignResultView";
import LoadoutView from "./components/LoadoutView";
import EscalationPromptView from "./components/EscalationPromptView";
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
        return <LoadoutView />;
      case "BATTLE_ACTIVE":
        return <BattleActiveView />;
      case "ESCALATION_PROMPT":
        return <EscalationPromptView />;
      case "BATTLE_RESULT":
        return <BattleResultView />;
      case "CAMPAIGN_RESULT":
        return <CampaignResultView />;
      default:
        return <LobbyView />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0e14] text-white flex items-center justify-center p-4 noise-overlay">
      {criticalError && (
        <div className="fixed top-0 inset-x-0 bg-red-900 text-red-200 p-3 text-center z-50 border-b-2 border-red-500">
          <span className="font-bold">Error {criticalError.code}:</span>{" "}
          {criticalError.message}{" "}
          <button onClick={reset} className="underline ml-2">Return to Lobby</button>
        </div>
      )}
      <PeerOverlay />
      <div className="w-full max-w-2xl">
        {/* Outer industrial bay frame */}
        <div className="chrome-plate chamfer-panel p-1 sm:p-2 border-2 border-amber-900/40">
          {/* Inner sealed compartment */}
          <div className="holo-surface border border-amber-900/30 p-2 sm:p-3">
            {renderView()}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
