import { createServer } from "node:http";
import { WebSocketServer } from "ws";
import { findFreePort } from "../utils/port.js";
import { ensureDirs, writeConfig, readConfig } from "../utils/config.js";
import { configPath } from "../utils/paths.js";
import { createRouter } from "./routes.js";
import { createWatcher } from "./watcher.js";
import { unlink } from "node:fs/promises";

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const IDLE_CHECK_INTERVAL_MS = 60 * 1000; // 60 seconds

export async function startServer(projectDir) {
  await ensureDirs(projectDir);

  const port = await findFreePort();
  const startedAt = Date.now();
  let lastActivity = Date.now();

  function touchActivity() {
    lastActivity = Date.now();
  }

  // -- WebSocket clients --
  const clients = new Set();

  function broadcast(message) {
    for (const ws of clients) {
      if (ws.readyState === ws.OPEN) {
        ws.send(message);
      }
    }
  }

  // -- HTTP server --
  const router = createRouter(projectDir, {
    broadcast,
    touchActivity,
    serverInfo: () => ({ port, startedAt }),
  });

  const httpServer = createServer(router);

  // -- WebSocket server --
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  wss.on("connection", (ws) => {
    clients.add(ws);
    touchActivity();
    ws.on("close", () => clients.delete(ws));
    ws.on("error", () => clients.delete(ws));
  });

  // -- File watcher --
  const watcher = createWatcher(projectDir, () => {
    touchActivity();
    broadcast(JSON.stringify({ type: "reload" }));
  });

  // -- Auto-shutdown --
  const idleTimer = setInterval(async () => {
    if (Date.now() - lastActivity > IDLE_TIMEOUT_MS) {
      await close();
    }
  }, IDLE_CHECK_INTERVAL_MS);
  idleTimer.unref();

  // -- Write config --
  await writeConfig(projectDir, {
    port,
    pid: process.pid,
    lastActivity: new Date(lastActivity).toISOString(),
    createdAt: new Date(startedAt).toISOString(),
  });

  // -- Start listening --
  await new Promise((resolve, reject) => {
    httpServer.listen(port, "127.0.0.1", resolve);
    httpServer.on("error", reject);
  });

  // -- Clean shutdown --
  async function close() {
    clearInterval(idleTimer);
    watcher.close();

    for (const ws of clients) {
      ws.close();
    }
    clients.clear();

    wss.close();

    await new Promise((resolve) => httpServer.close(resolve));

    // Remove config file best-effort
    try {
      await unlink(configPath(projectDir));
    } catch {
      // ignore
    }
  }

  return { port, close };
}
