// ---------------------------------------------------------
// TOP-LEVEL STATE
// ---------------------------------------------------------
GameState {
  sessionId: string
  phase: "LOBBY" | "CAMPAIGN" | "BATTLE" | "RESOLUTION"
  players: [PlayerState, PlayerState]
  campaign: CampaignState
  battle?: BattleState 
}

// ---------------------------------------------------------
// PLAYER ENTITY
// ---------------------------------------------------------
PlayerState {
  playerId: string
  role: "HOST" | "GUEST"
  faction: "IRON_HEGEMONY" | "SOLAR_COVENANT" | null
  voidScrap: number
  loadout: TacticalItem[]
  activeEffects: StatusEffect[]
  connected: boolean
}

// ---------------------------------------------------------
// CAMPAIGN STATE
// ---------------------------------------------------------
CampaignState {
  nodes: NodeState[7]
  activePlayerId: string
}

NodeState {
  nodeId: number
  owner: "HOST" | "GUEST" | "NEUTRAL"
  modifierId: string
  // NOTE: 'isIsolated' is strictly derived state. 
  // Computed via graph traversal at the start of each turn.
}

// ---------------------------------------------------------
// BATTLE STATE
// ---------------------------------------------------------
BattleState {
  contestedNodeId: number 
  turnCount: number // Absolute time metric for effect expiry and replay determinism
  board: BoardState
  activePlayerId: string
  dice: number[] | null // Length 2 (standard) or 4 (doubles)
  diceUsed: boolean[]   // Length must strictly match `dice` length
  escalation: EscalationState 
}

BoardState {
  points: Point[24]
  bars: { HOST: number; GUEST: number }
  borneOff: { HOST: number; GUEST: number }
}

Point {
  owner: "HOST" | "GUEST" | null
  count: number
  activeEffects: StatusEffect[] 
}

// ---------------------------------------------------------
// ITEMS & EFFECTS
// ---------------------------------------------------------
TacticalItem { 
  itemId: string 
  consumed: boolean
}

StatusEffect {
  effectId: string
  duration: number
  expiresOnTurn: number // Absolute expiry: (current turnCount + duration)
  sourcePlayerId: string
}

// ---------------------------------------------------------
// ESCALATION STATE
// ---------------------------------------------------------
EscalationState {
  status: "IDLE" | "OFFERED" // 'ACCEPTED' is implicit via multiplier/controller updates
  multiplier: number 
  controllerPlayerId: string | null 
}

// ---------------------------------------------------------
// INVARIANTS
// ---------------------------------------------------------
// 1. 15 pieces per player strictly enforced across points, bars, and borneOff.
// 2. Single active player unless EscalationState is 'OFFERED'.
// 3. Only controllerPlayerId may transition EscalationState to 'OFFERED'.
// 4. Dice MUST be used if valid moves exist in the generated move tree.
// 5. Items require valid trigger state and sufficient Void-Scrap validation.
