import { describe, it, expect, afterEach } from "vitest";
import { createTempProject, cleanupTempDir, writeSamplePage, startTestServer } from "../helpers.js";

describe("server", () => {
  let tmpDir;
  let server;

  afterEach(async () => {
    if (server) {
      await server.close();
      server = null;
    }
    if (tmpDir) {
      await cleanupTempDir(tmpDir);
      tmpDir = null;
    }
  });

  it("starts and responds to /health with valid JSON", async () => {
    tmpDir = await createTempProject();
    server = await startTestServer(tmpDir);

    const res = await fetch(`http://127.0.0.1:${server.port}/health`);
    expect(res.ok).toBe(true);

    const data = await res.json();
    expect(data).toHaveProperty("port", server.port);
    expect(data).toHaveProperty("pid");
    expect(typeof data.pid).toBe("number");
    expect(data).toHaveProperty("uptime");
    expect(typeof data.uptime).toBe("number");
  });

  it("serves static HTML files from pages directory", async () => {
    tmpDir = await createTempProject();
    await writeSamplePage(tmpDir, { filename: "test-page.html", title: "My Page" });
    server = await startTestServer(tmpDir);

    const res = await fetch(`http://127.0.0.1:${server.port}/pages/test-page.html`);
    expect(res.ok).toBe(true);

    const html = await res.text();
    expect(html).toContain("<title>My Page</title>");
  });

  it("GET /reload returns 200 and triggers WebSocket message", async () => {
    tmpDir = await createTempProject();
    server = await startTestServer(tmpDir);

    const res = await fetch(`http://127.0.0.1:${server.port}/reload`);
    expect(res.ok).toBe(true);

    const data = await res.json();
    expect(data).toEqual({ ok: true });
  });

  it("GET /api/pages returns correct JSON listing of pages with titles", async () => {
    tmpDir = await createTempProject();
    await writeSamplePage(tmpDir, { filename: "2025-01-01T00-00-00.html", title: "First Page" });
    await writeSamplePage(tmpDir, { filename: "2025-01-02T00-00-00.html", title: "Second Page" });
    server = await startTestServer(tmpDir);

    const res = await fetch(`http://127.0.0.1:${server.port}/api/pages`);
    expect(res.ok).toBe(true);

    const pages = await res.json();
    expect(pages).toHaveLength(2);
    // Sorted descending by filename
    expect(pages[0].filename).toBe("2025-01-02T00-00-00.html");
    expect(pages[0].title).toBe("Second Page");
    expect(pages[1].filename).toBe("2025-01-01T00-00-00.html");
    expect(pages[1].title).toBe("First Page");
  });

  it("handles graceful shutdown via close()", async () => {
    tmpDir = await createTempProject();
    server = await startTestServer(tmpDir);
    const port = server.port;

    // Verify server is up
    const res1 = await fetch(`http://127.0.0.1:${port}/health`);
    expect(res1.ok).toBe(true);

    // Close the server
    await server.close();
    server = null;

    // Verify server is down
    try {
      await fetch(`http://127.0.0.1:${port}/health`);
      expect.unreachable("Should have thrown");
    } catch (err) {
      expect(err.cause?.code).toBe("ECONNREFUSED");
    }
  });
});
