Title: System Architecture and Tech Stack
Purpose: Define the physical folder structure, the technology stack, strict dependency rules, and testing boundaries for the implementation agent.

1. Technology Stack

Language: TypeScript (Strict mode enabled across all packages).

Monorepo Tooling: npm workspaces (or Turborepo).

Frontend Client: React 18 (Vite), Zustand (State Management), Tailwind CSS (Styling).

Backend Server: Node.js, Express (API/Routing), Socket.io (Real-time loops).

Shared Package: Pure TypeScript. Contains all interfaces, schemas, and pure math/logic functions.

2. Physical Folder Structure
The repository must strictly adhere to this structure.

Plaintext
/BackgammonConquest
  ├── /apps
  │    ├── /client       # React SPA. Only imports from /shared.
  │    └── /server       # Node.js authoritative server. Only imports from /shared. (Integration tests live here)
  ├── /packages
  │    └── /shared       # Types, schemas, pure logic. NO React/Node dependencies. (Unit tests live here)
  ├── /docs              # Contains all formative design markdown files.
  ├── .env.example       # Base environment variables (ports, secrets).
  └── package.json       # Root monorepo configuration.
3. Architectural Boundaries (Strict Rules)

The "Shared" Constraint (Logic & Validation): The /shared directory must be framework-agnostic. It is the sole location for data structures, constants, and all validation logic (e.g., isValidMove, canInvokeEscalation, isItemTargetValid).

The Serialization Boundary: All network payloads (WebSockets and REST) MUST strictly type-check against the interfaces defined in /shared/src/payloads. No ad-hoc or inline JSON shapes are permitted in the client or server.

The "Client" Constraint: The client may NEVER compute game logic or assume outcomes. It only dispatches INTENT payloads via Socket.io and updates its Zustand store when a STATE_UPDATE payload is received.

The "Server" Constraint & Persistence: The server is the absolute source of truth. For this MVP phase, session state is ephemeral—active GameState objects are held in memory using a simple Map<sessionId, GameState>. Do not implement database persistence yet.

4. Testing & Environments

Unit Testing: All pure game logic and validation functions in /packages/shared must be covered by unit tests (e.g., using Vitest or Jest) to guarantee ruleset stability.

Integration Testing: The /apps/server directory is responsible for integration tests, specifically validating WebSocket connection lifecycles and state mutation workflows.

Environment Configuration: Port bindings and future secrets must be managed via a .env file, bootstrapped from .env.example at the root.
