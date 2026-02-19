import { describe, it, expect } from "vitest";
import { createServer } from "node:net";
import { findFreePort } from "../../src/utils/port.js";

function bindPort(port) {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.on("error", reject);
    srv.listen(port, "127.0.0.1", () => resolve(srv));
  });
}

function closeServer(srv) {
  return new Promise((resolve) => srv.close(resolve));
}

describe("findFreePort", () => {
  it("returns a port in range 3737-3747", async () => {
    const port = await findFreePort();
    expect(port).toBeGreaterThanOrEqual(3737);
    expect(port).toBeLessThanOrEqual(3747);
  });

  it("skips ports that are in use", async () => {
    // First find a free port, then block it
    const freePort = await findFreePort();
    const blocker = await bindPort(freePort);

    try {
      const nextPort = await findFreePort();
      expect(nextPort).not.toBe(freePort);
      expect(nextPort).toBeGreaterThanOrEqual(3737);
      expect(nextPort).toBeLessThanOrEqual(3747);
    } finally {
      await closeServer(blocker);
    }
  });

  it("throws when all ports are exhausted", async () => {
    const blockers = [];
    for (let port = 3737; port <= 3747; port++) {
      try {
        const srv = await bindPort(port);
        blockers.push(srv);
      } catch {
        // Port already in use by another process — that's fine, it's still blocked
      }
    }

    try {
      await expect(findFreePort()).rejects.toThrow(/No free port/);
    } finally {
      await Promise.all(blockers.map(closeServer));
    }
  });
});
