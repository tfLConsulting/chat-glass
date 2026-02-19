import { describe, it, expect } from "vitest";
import { join } from "node:path";
import { pagesDir, configPath, latestPath } from "../../src/utils/paths.js";

describe("path utilities", () => {
  const projectDir = "/tmp/test-project";

  it("pagesDir resolves correctly relative to project dir", () => {
    expect(pagesDir(projectDir)).toBe(join(projectDir, ".chat-glass", "pages"));
  });

  it("configPath resolves correctly", () => {
    expect(configPath(projectDir)).toBe(join(projectDir, ".chat-glass", "config.json"));
  });

  it("latestPath resolves correctly", () => {
    expect(latestPath(projectDir)).toBe(join(projectDir, ".chat-glass", "pages", "latest.html"));
  });
});
