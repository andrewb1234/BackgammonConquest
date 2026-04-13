# Matchmaking and Session Initialization

## Purpose
Define the user journey from application launch to the first campaign turn.

---

## Process Steps

### 1. Client Launch
- User is presented with two options:
  - **Create Game**
  - **Join Game**

---

### 2. Game Creation
- System generates a unique **6-digit alphanumeric string** (*Sector Code*).
- Host is placed in a waiting lobby:
  - Listens for incoming connection events.

---

### 3. Game Join
- Client inputs the **6-digit Sector Code**.
- System actions:
  - Validates code against active sessions.
  - Establishes connection via:
    - WebSockets or
    - WebRTC

---

### 4. Faction Selection
- Both clients are presented with a faction toggle:
  - **Iron Hegemony**
  - **Solar Covenant**
- System constraints:
  - Enforces **mutually exclusive selection**.
  - Player 1 selection locks the chosen faction.
  - Player 2 is restricted to the remaining faction.

---

### 5. Campaign Initialization
- System loads the **7-node map state**.
- Player assignment:
  - Host → **Node 1**
  - Guest → **Node 7**
- State transition:
  - Host client enters **Active Turn** state.
  - Host selects the first target node.
