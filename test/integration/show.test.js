import { describe, it, expect, afterEach } from "vitest";
import { readlink, stat, mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { show } from "../../src/commands/show.js";
import { writeConfig } from "../../src/utils/config.js";
import { createTempProject, cleanupTempDir, writeSamplePage } from "../helpers.js";

async function killByPort(port) {
  if (!port) return;
  // Try to find and kill the server process
  try {
    const res = await fetch(`http://127.0.0.1:${port}/health`);
    if (res.ok) {
      const data = await res.json();
      if (data.pid) {
        process.kill(data.pid, "SIGKILL");
      }
    }
  } catch {
    // server already dead
  }
  // Wait for port to be released
  for (let i = 0; i < 20; i++) {
    try {
      await fetch(`http://127.0.0.1:${port}/health`);
      await new Promise((r) => setTimeout(r, 50));
    } catch {
      return; // port is free
    }
  }
}

describe("show command", () => {
  let tmpDir;
  let port;

  afterEach(async () => {
    await killByPort(port);
    port = null;
    if (tmpDir) {
      await cleanupTempDir(tmpDir);
      tmpDir = null;
    }
  });

  it("starts a server when none is running", async () => {
    tmpDir = await createTempProject();
    const result = await show(tmpDir, { openBrowser: false });
    port = result.port;

    expect(result.port).toBeGreaterThanOrEqual(3737);
    expect(result.port).toBeLessThanOrEqual(3747);
    expect(result.isNew).toBe(true);

    const res = await fetch(`http://127.0.0.1:${result.port}/health`);
    expect(res.ok).toBe(true);
  });

  it("detects existing server and reuses it", async () => {
    tmpDir = await createTempProject();

    const result1 = await show(tmpDir, { openBrowser: false });
    port = result1.port;

    const result2 = await show(tmpDir, { openBrowser: false });
    expect(result2.port).toBe(result1.port);
    expect(result2.isNew).toBe(false);
  });

  it("recovers from stale config (dead PID)", async () => {
    tmpDir = await createTempProject();

    await writeConfig(tmpDir, {
      port: 3747,
      pid: 999999,
      lastActivity: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });

    const result = await show(tmpDir, { openBrowser: false });
    port = result.port;
    expect(result.isNew).toBe(true);

    const res = await fetch(`http://127.0.0.1:${result.port}/health`);
    expect(res.ok).toBe(true);
  });

  it("creates directories if missing", async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "chat-glass-test-"));

    const result = await show(tmpDir, { openBrowser: false });
    port = result.port;

    const pagesDir = join(tmpDir, ".chat-glass", "pages");
    const st = await stat(pagesDir);
    expect(st.isDirectory()).toBe(true);
  });

  it("updates latest.html symlink", async () => {
    tmpDir = await createTempProject();

    await writeSamplePage(tmpDir, { filename: "2025-01-01T00-00-00.html", title: "Older" });
    await writeSamplePage(tmpDir, { filename: "2025-01-02T00-00-00.html", title: "Newer" });

    const result = await show(tmpDir, { openBrowser: false });
    port = result.port;

    const linkTarget = await readlink(join(tmpDir, ".chat-glass", "pages", "latest.html"));
    expect(linkTarget).toBe("2025-01-02T00-00-00.html");
  });
});
