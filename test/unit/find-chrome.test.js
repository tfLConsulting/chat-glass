import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("findChrome", () => {
  let originalPlatform;

  beforeEach(() => {
    originalPlatform = process.platform;
    vi.resetModules();
  });

  afterEach(() => {
    Object.defineProperty(process, "platform", { value: originalPlatform });
    vi.restoreAllMocks();
  });

  it("returns Chrome path on macOS when Chrome exists", async () => {
    Object.defineProperty(process, "platform", { value: "darwin" });

    vi.doMock("node:fs/promises", () => ({
      access: vi.fn().mockResolvedValue(undefined),
    }));

    const { findChrome } = await import("../../src/utils/find-chrome.js");
    const result = await findChrome();

    expect(result).toBe(
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    );
  });

  it("returns first available path on Linux", async () => {
    Object.defineProperty(process, "platform", { value: "linux" });

    vi.doMock("node:fs/promises", () => ({
      access: vi
        .fn()
        .mockRejectedValueOnce(new Error("ENOENT")) // google-chrome not found
        .mockResolvedValueOnce(undefined), // chromium-browser found
    }));

    const { findChrome } = await import("../../src/utils/find-chrome.js");
    const result = await findChrome();

    expect(result).toBe("/usr/bin/chromium-browser");
  });

  it("returns null when no Chrome is installed", async () => {
    Object.defineProperty(process, "platform", { value: "darwin" });

    vi.doMock("node:fs/promises", () => ({
      access: vi.fn().mockRejectedValue(new Error("ENOENT")),
    }));

    const { findChrome } = await import("../../src/utils/find-chrome.js");
    const result = await findChrome();

    expect(result).toBeNull();
  });

  it("returns null on unknown platform", async () => {
    Object.defineProperty(process, "platform", { value: "freebsd" });

    const { findChrome } = await import("../../src/utils/find-chrome.js");
    const result = await findChrome();

    expect(result).toBeNull();
  });
});
