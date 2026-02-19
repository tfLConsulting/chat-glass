import { describe, it, expect, afterEach } from "vitest";
import { stat, mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  createTempProject,
  cleanupTempDir,
  startTestServer,
  writeSamplePage,
} from "../helpers.js";
import { captureScreenshot } from "../../src/utils/screenshot.js";
import { findChrome } from "../../src/utils/find-chrome.js";

describe("screenshot integration", () => {
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

  it("captures a PNG screenshot when Chrome is available", async () => {
    const chromePath = await findChrome();
    if (!chromePath) {
      // Skip this test on machines without Chrome
      console.log("Skipping: Chrome not found");
      return;
    }

    let puppeteerAvailable = true;
    try {
      await import("puppeteer-core");
    } catch {
      puppeteerAvailable = false;
    }

    if (!puppeteerAvailable) {
      console.log("Skipping: puppeteer-core not available");
      return;
    }

    tmpDir = await createTempProject();
    await writeSamplePage(tmpDir, {
      filename: "test-page.html",
      title: "Screenshot Test",
      body: "<h1 style='color:white;background:#1a1a2e;padding:40px;'>Hello Screenshot</h1>",
    });
    server = await startTestServer(tmpDir);

    const outputPath = join(tmpDir, "test-screenshot.png");
    const result = await captureScreenshot(server.port, outputPath);

    expect(result).toBe(outputPath);

    const fileStat = await stat(outputPath);
    expect(fileStat.size).toBeGreaterThan(0);
  });

  it("returns null without throwing when puppeteer-core is unavailable", async () => {
    // captureScreenshot should never throw — it always returns null on failure
    // We can't truly remove puppeteer-core here, but we can verify the contract
    // by calling with an invalid port where no server is listening
    tmpDir = await createTempProject();
    const outputPath = join(tmpDir, "no-server-screenshot.png");
    const result = await captureScreenshot(19999, outputPath);

    // Either null (connection refused) or a path — but should never throw
    // With no server on port 19999, expect null
    expect(result).toBeNull();
  });
});
