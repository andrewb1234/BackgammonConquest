import express from "express";
import http from "http";
import { Server as SocketServer, Socket } from "socket.io";
import dotenv from "dotenv";
import type { SocketMessage } from "@backgammon-conquest/shared";
import { routeIntent } from "./intentRouter.js";
import {
  getSessionByPlayerId,
  markPlayerDisconnected,
  removePlayerFromIndex,
} from "./sessionManager.js";
import {
  broadcastStateUpdate,
  broadcastPeerDisconnected,
} from "./broadcast.js";
import { applyForfeit } from "./handlers/resolution.js";
import { registerTestHooks } from "./testHooks.js";

dotenv.config({ path: "../../.env" });

const PORT = parseInt(process.env.PORT || "3001", 10);
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
const RECONNECT_GRACE_PERIOD_MS = 45_000;
const TEST_HOOKS_ENABLED = process.env.ENABLE_TEST_HOOKS === "1";

const app = express();
const server = http.createServer(app);
const io = new SocketServer(server, {
  cors: { origin: CLIENT_URL, methods: ["GET", "POST"] },
});

// Minimal CORS for HTTP endpoints (used by the Playwright test hooks).
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", CLIENT_URL);
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  next();
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok", testHooks: TEST_HOOKS_ENABLED });
});

if (TEST_HOOKS_ENABLED) {
  registerTestHooks(app);
}

// ---------------------------------------------------------
// SOCKET CONNECTION LIFECYCLE
// ---------------------------------------------------------

io.on("connection", (socket: Socket) => {
  console.log(`[Socket] Connected: ${socket.id}`);

  // Client identifies itself on connect
  socket.on("IDENTIFY", (clientId: string) => {
    socket.data.clientId = clientId;
    console.log(`[Socket] Identified: ${socket.id} → ${clientId}`);
  });

  // Unified intent router
  socket.on("INTENT", (msg: SocketMessage<unknown>) => {
    routeIntent(io, socket, msg);
  });

  // Disconnect handling
  socket.on("disconnect", (reason) => {
    console.log(`[Socket] Disconnected: ${socket.id} — ${reason}`);

    const clientId = socket.data.clientId as string | undefined;
    if (!clientId) return;

    const gameState = markPlayerDisconnected(clientId);
    if (!gameState) return;

    broadcastPeerDisconnected(
      io,
      gameState.sessionId,
      clientId,
      RECONNECT_GRACE_PERIOD_MS,
    );

    broadcastStateUpdate(io, gameState, ["players"]);

    // Grace period: after timeout, if still disconnected, forfeit
    setTimeout(() => {
      const current = getSessionByPlayerId(clientId);
      if (!current) return;

      const player = current.players.find((p) => p.playerId === clientId);
      if (player && !player.connected) {
        console.log(`[Reconnect] Grace expired for ${clientId} — forfeit`);

        // Determine loser role and apply forfeit
        const loserRole = player.role;
        const deltas = applyForfeit(current, loserRole);
        removePlayerFromIndex(clientId);
        broadcastStateUpdate(io, current, deltas);
      }
    }, RECONNECT_GRACE_PERIOD_MS);
  });
});

server.listen(PORT, () => {
  console.log(`[Server] Listening on port ${PORT}`);
});
