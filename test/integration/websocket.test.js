import { describe, it, expect, afterEach } from "vitest";
import WebSocket from "ws";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createTempProject, cleanupTempDir, startTestServer } from "../helpers.js";

function connectWs(port) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    ws.on("open", () => resolve(ws));
    ws.on("error", reject);
  });
}

function waitForMessage(ws, timeoutMs = 3000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("WS message timeout")), timeoutMs);
    ws.once("message", (data) => {
      clearTimeout(timer);
      resolve(JSON.parse(data.toString()));
    });
  });
}

describe("websocket", () => {
  let tmpDir;
  let server;
  let ws;
  let extraWs = [];

  afterEach(async () => {
    for (const w of extraWs) {
      if (w.readyState === WebSocket.OPEN) w.close();
    }
    extraWs = [];
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close();
      ws = null;
    }
    if (server) {
      await server.close();
      server = null;
    }
    if (tmpDir) {
      await cleanupTempDir(tmpDir);
      tmpDir = null;
    }
  });

  it("client connects to /ws", async () => {
    tmpDir = await createTempProject();
    server = await startTestServer(tmpDir);
    ws = await connectWs(server.port);
    expect(ws.readyState).toBe(WebSocket.OPEN);
  });

  it("client receives reload message when /reload is hit", async () => {
    tmpDir = await createTempProject();
    server = await startTestServer(tmpDir);
    ws = await connectWs(server.port);

    const msgPromise = waitForMessage(ws);
    await fetch(`http://127.0.0.1:${server.port}/reload`);
    const msg = await msgPromise;

    expect(msg).toEqual({ type: "reload" });
  });

  it("client receives reload message when file is written to pages dir", async () => {
    tmpDir = await createTempProject();
    server = await startTestServer(tmpDir);
    ws = await connectWs(server.port);

    const msgPromise = waitForMessage(ws);
    const pagesDir = join(tmpDir, ".chat-glass", "pages");
    await writeFile(join(pagesDir, "new-page.html"), "<html><body>New</body></html>", "utf8");
    const msg = await msgPromise;

    expect(msg).toEqual({ type: "reload" });
  });

  it("multiple clients all receive reload message", async () => {
    tmpDir = await createTempProject();
    server = await startTestServer(tmpDir);

    const ws1 = await connectWs(server.port);
    const ws2 = await connectWs(server.port);
    extraWs.push(ws1, ws2);

    const msg1Promise = waitForMessage(ws1);
    const msg2Promise = waitForMessage(ws2);

    await fetch(`http://127.0.0.1:${server.port}/reload`);

    const [msg1, msg2] = await Promise.all([msg1Promise, msg2Promise]);
    expect(msg1).toEqual({ type: "reload" });
    expect(msg2).toEqual({ type: "reload" });
  });
});
