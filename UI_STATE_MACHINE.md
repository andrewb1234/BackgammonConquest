# Client UI State Machine and View Routing

## Purpose
Define client-side view states, transitions, input constraints, and synchronization requirements for deterministic routing.

---

## Core States
- **LOBBY**: Session creation/join  
- **WAITING**: Await connection/validation  
- **FACTION_SELECT**: Faction locking  
- **CAMPAIGN_MAP**: Strategic node view  
- **LOADOUT**: Item selection and spend  
- **BATTLE_ACTIVE**: Core board view  
- **ESCALATION_PROMPT**: Modal decision state  
- **BATTLE_RESULT**: Battle outcome  
- **CAMPAIGN_RESULT**: Final outcome  

---

## Transitions

### From LOBBY
- → **WAITING** (request dispatched)

### From WAITING
- → **FACTION_SELECT** (handshake success)  
- → **LOBBY** (timeout/cancel)

### From FACTION_SELECT
- → **CAMPAIGN_MAP** (factions locked)  
- → **LOBBY** (disconnect)

### From CAMPAIGN_MAP
- → **LOADOUT** (active player selects node)  
- → **LOBBY** (disconnect/forfeit)

### From LOADOUT
- → **BATTLE_ACTIVE** (server `MATCH_READY`)  
- → **LOBBY** (disconnect)

### From BATTLE_ACTIVE
- → **ESCALATION_PROMPT** (invoke escalation)  
- → **BATTLE_RESULT** (win condition)  
- → **LOBBY** (disconnect/forfeit)

### From ESCALATION_PROMPT
- → **BATTLE_ACTIVE** (accept)  
- → **BATTLE_RESULT** (retreat)  
- → **LOBBY** (disconnect/timeout)

### From BATTLE_RESULT
- → **CAMPAIGN_MAP** (ACK or 15s timeout, non-capital)  
- → **CAMPAIGN_RESULT** (ACK or timeout, capital)  
- → **LOBBY** (disconnect)

### From CAMPAIGN_RESULT
- → **LOBBY** (session end)

---

## Input Constraints

### Macro Turn Lock
- Only `activePlayerId` may select nodes  
- Opponent is view-only  

### Micro Turn Lock
- Disable inputs if not active player  

### Escalation Lock
- Both see prompt  
- Only defender input enabled  

### Loadout Sync
- Both clients must send `READY`  
- Server confirms before transition  
