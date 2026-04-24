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
import ArchonShell from "./components/ArchonShell";

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
    <>
      {criticalError && (
        <div
          className="fixed top-0 inset-x-0 z-50 bg-error-container/95 text-on-error-container px-4 py-3 text-center border-b-2 border-error font-headline tracking-[0.15em] uppercase text-[12px]"
          role="alert"
        >
          <span className="font-black">SYSTEM FAULT {criticalError.code}</span>
          <span className="mx-3 opacity-60">·</span>
          <span className="font-body normal-case tracking-normal text-sm">
            {criticalError.message}
          </span>
          <button
            onClick={reset}
            className="ml-4 underline hover:text-error focus:outline-none"
          >
            Return to Lobby
          </button>
        </div>
      )}
      <PeerOverlay />
      <ArchonShell>{renderView()}</ArchonShell>
    </>
  );
}

export default App;
