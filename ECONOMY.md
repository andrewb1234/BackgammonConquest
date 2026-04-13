# Currency Math and Escalation State Machine

## Purpose
Define Void-Scrap constraints and doubling cube logic.

---

## Economy Constants

Let:
- **W** = Win reward  
- **L** = Loss reward  
- **C** = Tactical item cost  

### Rules
- **L = W × 0.40**
- **C = W × 2.5**

---

## Escalation Protocol

### Overview
Stake escalation with ownership transfer.

---

## State Variables
- **M** = Multiplier (default **1×**)  
- **Controller** = Player allowed to escalate  

### Initialization
- **M = 1×**
- **Controller = Host**
- **Host = User who initiated battle**

---

## Invocation Rules
- Only **Controller** may escalate  
- Must occur on their turn, before rolling  

---

## State Transition
- Match pauses  
- Opponent chooses: **Accept** or **Retreat**

---

## Outcomes

### Accept
- **M → M × 2**
- Match resumes  
- Control transfers to opponent  

### Retreat
- Match ends  
- Invoker wins node and receives **W × M**  
- Opponent receives **L** (not multiplied)  

---

## End-of-Match
- **Winner:** `W × M`  
- **Loser:** `L`  

---

## Design Implications
- Higher stakes increase reward only  
- Loss protection remains fixed  
- Control transfer enforces pacing  
