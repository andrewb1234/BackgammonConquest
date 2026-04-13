# Status Effect Lifecycle, Hooks, and Resolution

## Purpose
Standardize application, validation, expiry, and scope of temporary modifiers.

---

## 1. Data Structure

Effects are stored on the entity they modify.

```ts
StatusEffect {
  effectId: string
  expiresOnTurn: number
  sourcePlayerId: string
  params?: Record<string, any>
}
Added to BattleState:
globalEffects: StatusEffect[]
2. Time & Expiry
Turn Count: Increments per player turn
Deferred Expiry:
At Upkeep, remove effects where
expiresOnTurn <= turnCount
Immediate Expiry:
Triggered by hooks (e.g., shield break)
Overrides deferred expiry
3. Effect Scopes
Point-Level: board.points[i].activeEffects
Player-Level: players[i].activeEffects
Global-Level: battle.globalEffects
Source Authority
Effects are non-stackable by default
Can only overwrite if:
Same sourcePlayerId
OR explicitly allowed (e.g., Cleanse)
4. Intent Execution Order
On INTENT:
Load relevant effects (global → player → point)
Apply Overrides (priority-based)
Validate intent → reject if invalid
Mutate state
Resolve Hooks (immediate deletions)
5. State Masking
Canonical GameState is never sent directly
Server applies:
MaskState(gameState, playerId)
Removes hidden data (e.g., RNG, loadouts)
Ensures player-specific visibility
6. Priority Hierarchy
Defensive Overrides (e.g., block hits)
Movement Constraints
Information Modifiers
Macro Constraints (lowest)
