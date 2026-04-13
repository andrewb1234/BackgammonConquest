// ---------------------------------------------------------
// ENUMS & LITERAL TYPES
// ---------------------------------------------------------

export type GamePhase = "LOBBY" | "CAMPAIGN" | "BATTLE" | "RESOLUTION";

export type PlayerRole = "HOST" | "GUEST";

export type Faction = "IRON_HEGEMONY" | "SOLAR_COVENANT";

export type NodeOwner = PlayerRole | "NEUTRAL";

export type EscalationStatus = "IDLE" | "OFFERED";

export type EscalationResponse = "ACCEPT" | "RETREAT";

// ---------------------------------------------------------
// TOP-LEVEL STATE
// ---------------------------------------------------------

export interface GameState {
  sessionId: string;
  phase: GamePhase;
  players: [PlayerState, PlayerState];
  campaign: CampaignState;
  battle?: BattleState;
}

// ---------------------------------------------------------
// PLAYER ENTITY
// ---------------------------------------------------------

export interface PlayerState {
  playerId: string;
  role: PlayerRole;
  faction: Faction | null;
  voidScrap: number;
  loadout: TacticalItem[];
  activeEffects: StatusEffect[];
  connected: boolean;
}

// ---------------------------------------------------------
// CAMPAIGN STATE
// ---------------------------------------------------------

export interface CampaignState {
  nodes: [NodeState, NodeState, NodeState, NodeState, NodeState, NodeState, NodeState];
  activePlayerId: string;
}

export interface NodeState {
  nodeId: number;
  owner: NodeOwner;
  modifierId: string;
}

// ---------------------------------------------------------
// BATTLE STATE
// ---------------------------------------------------------

export interface BattleState {
  contestedNodeId: number;
  turnCount: number;
  board: BoardState;
  activePlayerId: string;
  dice: number[] | null;
  diceUsed: boolean[];
  escalation: EscalationState;
}

export interface BoardState {
  points: Point[];
  bars: Record<PlayerRole, number>;
  borneOff: Record<PlayerRole, number>;
}

export interface Point {
  owner: PlayerRole | null;
  count: number;
  activeEffects: StatusEffect[];
}

// ---------------------------------------------------------
// ITEMS & EFFECTS
// ---------------------------------------------------------

export interface TacticalItem {
  itemId: string;
  consumed: boolean;
}

export interface StatusEffect {
  effectId: string;
  duration: number;
  expiresOnTurn: number;
  sourcePlayerId: string;
}

// ---------------------------------------------------------
// ESCALATION STATE
// ---------------------------------------------------------

export interface EscalationState {
  status: EscalationStatus;
  multiplier: number;
  controllerPlayerId: string | null;
}
