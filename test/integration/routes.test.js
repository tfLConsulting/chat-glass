import { describe, it, expect, afterEach } from "vitest";
import { symlink } from "node:fs/promises";
import { join } from "node:path";
import { createTempProject, cleanupTempDir, writeSamplePage, startTestServer } from "../helpers.js";

describe("routes", () => {
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

  describe("path traversal prevention", () => {
    it("rejects /pages/../../etc/passwd", async () => {
      tmpDir = await createTempProject();
      server = await startTestServer(tmpDir);

      const res = await fetch(`http://127.0.0.1:${server.port}/pages/../../etc/passwd`);
      expect(res.status).toBe(404);
    });

    it("rejects /pages/foo/../bar.html", async () => {
      tmpDir = await createTempProject();
      server = await startTestServer(tmpDir);

      const res = await fetch(`http://127.0.0.1:${server.port}/pages/foo/../bar.html`);
      expect(res.status).toBe(404);
    });

    it("rejects /pages/subdir/file.html (contains /)", async () => {
      tmpDir = await createTempProject();
      server = await startTestServer(tmpDir);

      const res = await fetch(`http://127.0.0.1:${server.port}/pages/subdir/file.html`);
      expect(res.status).toBe(404);
    });
  });

  describe("404 for unknown routes", () => {
    it("GET /nonexistent returns 404", async () => {
      tmpDir = await createTempProject();
      server = await startTestServer(tmpDir);

      const res = await fetch(`http://127.0.0.1:${server.port}/nonexistent`);
      expect(res.status).toBe(404);
      const body = await res.text();
      expect(body).toContain("404");
    });
  });

  describe("405 for non-GET methods", () => {
    it("POST /health returns 405", async () => {
      tmpDir = await createTempProject();
      server = await startTestServer(tmpDir);

      const res = await fetch(`http://127.0.0.1:${server.port}/health`, { method: "POST" });
      expect(res.status).toBe(405);
    });

    it("PUT /reload returns 405", async () => {
      tmpDir = await createTempProject();
      server = await startTestServer(tmpDir);

      const res = await fetch(`http://127.0.0.1:${server.port}/reload`, { method: "PUT" });
      expect(res.status).toBe(405);
    });
  });

  describe("main view and gallery", () => {
    it("GET / returns 200 with HTML containing chat-glass", async () => {
      tmpDir = await createTempProject();
      server = await startTestServer(tmpDir);

      const res = await fetch(`http://127.0.0.1:${server.port}/`);
      expect(res.status).toBe(200);
      const body = await res.text();
      expect(body).toContain("chat-glass");
    });

    it("GET /gallery returns 200 with HTML", async () => {
      tmpDir = await createTempProject();
      server = await startTestServer(tmpDir);

      const res = await fetch(`http://127.0.0.1:${server.port}/gallery`);
      expect(res.status).toBe(200);
      const contentType = res.headers.get("content-type");
      expect(contentType).toContain("text/html");
    });
  });

  describe("API pages edge cases", () => {
    it("GET /api/pages with empty pages dir returns []", async () => {
      tmpDir = await createTempProject();
      server = await startTestServer(tmpDir);

      const res = await fetch(`http://127.0.0.1:${server.port}/api/pages`);
      expect(res.ok).toBe(true);
      const pages = await res.json();
      expect(pages).toEqual([]);
    });

    it("GET /api/pages excludes latest.html symlink", async () => {
      tmpDir = await createTempProject();
      await writeSamplePage(tmpDir, {
        filename: "2025-01-01T00-00-00.html",
        title: "Real Page",
      });

      // Create a latest.html symlink
      const pagesDir = join(tmpDir, ".chat-glass", "pages");
      await symlink("2025-01-01T00-00-00.html", join(pagesDir, "latest.html"));

      server = await startTestServer(tmpDir);

      const res = await fetch(`http://127.0.0.1:${server.port}/api/pages`);
      const pages = await res.json();

      expect(pages).toHaveLength(1);
      expect(pages[0].filename).toBe("2025-01-01T00-00-00.html");
    });
  });
});
