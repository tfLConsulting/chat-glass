import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("captureScreenshot", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns null when puppeteer-core import fails", async () => {
    vi.doMock("puppeteer-core", () => {
      throw new Error("Cannot find module 'puppeteer-core'");
    });

    const { captureScreenshot } = await import(
      "../../src/utils/screenshot.js"
    );
    const result = await captureScreenshot(3737, "/tmp/test.png");
    expect(result).toBeNull();
  });

  it("returns null when findChrome returns null", async () => {
    vi.doMock("../../src/utils/find-chrome.js", () => ({
      findChrome: async () => null,
    }));

    vi.doMock("puppeteer-core", () => ({
      default: { launch: vi.fn() },
    }));

    const { captureScreenshot } = await import(
      "../../src/utils/screenshot.js"
    );
    const result = await captureScreenshot(3737, "/tmp/test.png");
    expect(result).toBeNull();
  });

  it("returns null and calls browser.close on screenshot failure", async () => {
    const closeFn = vi.fn();
    const mockPage = {
      setViewport: vi.fn().mockResolvedValue(undefined),
      goto: vi.fn().mockResolvedValue(undefined),
      screenshot: vi.fn().mockRejectedValue(new Error("Screenshot failed")),
    };
    const mockBrowser = {
      newPage: vi.fn().mockResolvedValue(mockPage),
      close: closeFn,
    };

    vi.doMock("../../src/utils/find-chrome.js", () => ({
      findChrome: async () => "/usr/bin/google-chrome",
    }));

    vi.doMock("puppeteer-core", () => ({
      default: { launch: vi.fn().mockResolvedValue(mockBrowser) },
    }));

    const { captureScreenshot } = await import(
      "../../src/utils/screenshot.js"
    );
    const result = await captureScreenshot(3737, "/tmp/test.png");

    expect(result).toBeNull();
    expect(closeFn).toHaveBeenCalled();
  });

  it("returns null without hanging when operation times out", async () => {
    const closeFn = vi.fn();
    const mockBrowser = {
      newPage: () => new Promise(() => {}), // never resolves
      close: closeFn,
    };

    vi.doMock("../../src/utils/find-chrome.js", () => ({
      findChrome: async () => "/usr/bin/google-chrome",
    }));

    vi.doMock("puppeteer-core", () => ({
      default: { launch: vi.fn().mockResolvedValue(mockBrowser) },
    }));

    const { captureScreenshot } = await import(
      "../../src/utils/screenshot.js"
    );

    const start = Date.now();
    const result = await captureScreenshot(3737, "/tmp/test.png");
    const elapsed = Date.now() - start;

    expect(result).toBeNull();
    // Should return within ~6 seconds (5s timeout + buffer)
    expect(elapsed).toBeLessThan(7000);
  });
});
