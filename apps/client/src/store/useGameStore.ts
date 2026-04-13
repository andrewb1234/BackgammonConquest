import { create } from "zustand";
import type {
  GameState,
  Faction,
  IntentType,
  RejectionReason,
} from "@backgammon-conquest/shared";
import {
  connectSocket,
  identify,
  sendIntent,
  onSessionCreated,
  onSessionJoined,
  onStateUpdate,
  onRejectIntent,
  onPeerDisconnected,
  onPeerReconnected,
  onCriticalError,
} from "../services/socket.js";

// ---------------------------------------------------------
// UI VIEW STATE (from UI_STATE_MACHINE.md)
// ---------------------------------------------------------

export type UIView =
  | "LOBBY"
  | "WAITING"
  | "FACTION_SELECT"
  | "CAMPAIGN_MAP"
  | "LOADOUT"
  | "BATTLE_ACTIVE"
  | "ESCALATION_PROMPT"
  | "BATTLE_RESULT"
  | "CAMPAIGN_RESULT";

// ---------------------------------------------------------
// STORE INTERFACE
// ---------------------------------------------------------

export interface GameStoreState {
  clientId: string;
  sessionId: string | null;
  sectorCode: string | null;
  gameState: GameState | null;
  uiView: UIView;
  lastRejection: { intentType: string; reason: RejectionReason; serverStateVersion: number } | null;
  peerDisconnected: boolean;
  criticalError: { message: string; code: number } | null;

  // Actions
  init: () => void;
  createSession: () => void;
  joinSession: (sectorCode: string) => void;
  lockFaction: (faction: Faction) => void;
  sendGameIntent: (type: IntentType, payload: Record<string, unknown>) => void;
  reset: () => void;
}

// ---------------------------------------------------------
// VIEW DERIVATION
// ---------------------------------------------------------

function deriveUIView(gameState: GameState | null, hasSectorCode: boolean): UIView {
  if (!gameState) return "LOBBY";

  switch (gameState.phase) {
    case "LOBBY": {
      const bothConnected = gameState.players.every((p) => p.connected && p.playerId !== "");
      const bothFactionsSet = gameState.players.every((p) => p.faction !== null);
      if (!bothConnected && hasSectorCode) return "WAITING";
      if (!bothFactionsSet) return "FACTION_SELECT";
      return "WAITING";
    }
    case "CAMPAIGN":
      return "CAMPAIGN_MAP";
    case "BATTLE": {
      if (gameState.battle?.escalation.status === "OFFERED") return "ESCALATION_PROMPT";
      return "BATTLE_ACTIVE";
    }
    case "RESOLUTION":
      if (gameState.campaignWinner) return "CAMPAIGN_RESULT";
      return "BATTLE_RESULT";
    default:
      return "LOBBY";
  }
}

// ---------------------------------------------------------
// STORE
// ---------------------------------------------------------

export const useGameStore = create<GameStoreState>((set, get) => ({
  clientId: crypto.randomUUID(),
  sessionId: null,
  sectorCode: null,
  gameState: null,
  uiView: "LOBBY",
  lastRejection: null,
  peerDisconnected: false,
  criticalError: null,

  init: () => {
    const { clientId } = get();
    connectSocket();

    // Wait for connection before identifying
    const socket = connectSocket();
    socket.on("connect", () => {
      identify(clientId);
    });

    // Register broadcast listeners
    onSessionCreated((payload) => {
      set({
        sessionId: payload.sessionId,
        sectorCode: payload.sectorCode,
        uiView: "WAITING",
      });
    });

    onSessionJoined((payload) => {
      set({
        sessionId: payload.sessionId,
        uiView: "FACTION_SELECT",
      });
    });

    onStateUpdate((payload) => {
      const state = get();
      const uiView = deriveUIView(payload.gameState, state.sectorCode !== null);
      set({
        gameState: payload.gameState,
        uiView,
        lastRejection: null,
      });
    });

    onRejectIntent((payload) => {
      set({
        lastRejection: {
          intentType: payload.type,
          reason: payload.reason as RejectionReason,
          serverStateVersion: payload.serverStateVersion,
        },
      });
    });

    onPeerDisconnected(() => {
      set({ peerDisconnected: true });
    });

    onPeerReconnected(() => {
      set({ peerDisconnected: false });
    });

    onCriticalError((payload) => {
      set({
        criticalError: payload,
        uiView: "LOBBY",
      });
    });
  },

  createSession: () => {
    const { clientId } = get();
    sendIntent("CREATE_SESSION", { clientId });
  },

  joinSession: (sectorCode: string) => {
    const { clientId } = get();
    sendIntent("JOIN_SESSION", { clientId, sectorCode });
  },

  lockFaction: (faction: Faction) => {
    sendIntent("LOCK_FACTION", { faction });
  },

  sendGameIntent: (type: IntentType, payload: Record<string, unknown>) => {
    const { gameState } = get();
    const stateVersion = gameState?.stateVersion ?? 0;
    sendIntent(type, { ...payload, stateVersion });
  },

  reset: () => {
    set({
      sessionId: null,
      sectorCode: null,
      gameState: null,
      uiView: "LOBBY",
      lastRejection: null,
      peerDisconnected: false,
      criticalError: null,
    });
  },
}));
