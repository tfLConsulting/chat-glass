import { describe, it, expect, afterEach } from "vitest";
import { writeFile } from "node:fs/promises";
import { readConfig, writeConfig } from "../../src/utils/config.js";
import { configPath } from "../../src/utils/paths.js";
import { createTempProject, cleanupTempDir } from "../helpers.js";

describe("config utilities", () => {
  let tmpDir;

  afterEach(async () => {
    if (tmpDir) await cleanupTempDir(tmpDir);
    tmpDir = null;
  });

  it("readConfig returns defaults when no config exists", async () => {
    tmpDir = await createTempProject();
    const config = await readConfig(tmpDir);
    expect(config).toEqual({
      port: null,
      pid: null,
      lastActivity: null,
      createdAt: null,
    });
  });

  it("writeConfig creates file and parent dirs", async () => {
    tmpDir = await createTempProject();
    await writeConfig(tmpDir, { port: 3737, pid: 123 });
    const config = await readConfig(tmpDir);
    expect(config.port).toBe(3737);
    expect(config.pid).toBe(123);
  });

  it("round-trip: write then read returns same data", async () => {
    tmpDir = await createTempProject();
    const data = {
      port: 3740,
      pid: 99999,
      lastActivity: "2025-01-01T00:00:00.000Z",
      createdAt: "2025-01-01T00:00:00.000Z",
    };
    await writeConfig(tmpDir, data);
    const config = await readConfig(tmpDir);
    expect(config).toEqual(data);
  });

  it("readConfig recovers from corrupt JSON", async () => {
    tmpDir = await createTempProject();
    await writeFile(configPath(tmpDir), "{{not valid json!!", "utf8");
    const config = await readConfig(tmpDir);
    expect(config).toEqual({
      port: null,
      pid: null,
      lastActivity: null,
      createdAt: null,
    });
  });
});
