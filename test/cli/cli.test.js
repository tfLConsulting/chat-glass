import { describe, it, expect, afterEach } from "vitest";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createTempProject, cleanupTempDir, writeSamplePage } from "../helpers.js";

const CLI = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "bin", "cli.js");
const NODE = process.execPath;

function run(args, opts = {}) {
  return new Promise((resolve) => {
    execFile(NODE, [CLI, ...args], { timeout: 10000, ...opts }, (error, stdout, stderr) => {
      resolve({
        code: error ? error.code ?? 1 : 0,
        stdout: stdout.toString(),
        stderr: stderr.toString(),
      });
    });
  });
}

describe("CLI", () => {
  let tmpDir;

  afterEach(async () => {
    if (tmpDir) {
      await cleanupTempDir(tmpDir);
      tmpDir = null;
    }
  });

  it("--help exits 0 and prints usage", async () => {
    const result = await run(["--help"]);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("Usage:");
    expect(result.stdout).toContain("chat-glass");
  });

  it("list with no pages reports empty", async () => {
    tmpDir = await createTempProject();
    const result = await run(["list"], { cwd: tmpDir });
    expect(result.code).toBe(0);
    expect(result.stdout).toMatch(/no pages/i);
  });

  it("list with sample pages reports them", async () => {
    tmpDir = await createTempProject();
    await writeSamplePage(tmpDir, { filename: "2025-01-01T00-00-00.html", title: "Test Title" });
    const result = await run(["list"], { cwd: tmpDir });
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("2025-01-01T00-00-00.html");
    expect(result.stdout).toContain("Test Title");
    expect(result.stdout).toContain("1 page(s)");
  });

  it("clean removes pages", async () => {
    tmpDir = await createTempProject();
    await writeSamplePage(tmpDir, { filename: "to-delete.html" });
    const result = await run(["clean"], { cwd: tmpDir });
    expect(result.code).toBe(0);
    expect(result.stdout).toMatch(/removed 1 page/i);
  });

  it("install-agent --local copies the agent file", async () => {
    tmpDir = await createTempProject();
    const result = await run(["install-agent", "--local"], { cwd: tmpDir });
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("Agent installed");

    const agentPath = join(tmpDir, ".claude", "agents", "chat-glass.md");
    const content = await readFile(agentPath, "utf8");
    expect(content.length).toBeGreaterThan(0);
  });

  it("install-agent --local --dev rewrites commands to local paths", async () => {
    tmpDir = await createTempProject();
    const result = await run(["install-agent", "--local", "--dev"], { cwd: tmpDir });
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("dev mode");

    const agentPath = join(tmpDir, ".claude", "agents", "chat-glass.md");
    const content = await readFile(agentPath, "utf8");

    // Should reference the local bin/cli.js, not the global `chat-glass` command
    expect(content).toContain("node ");
    expect(content).toContain("bin/cli.js");
    expect(content).not.toMatch(/`chat-glass show`/);
  });

  it("unknown command exits 1 and prints error", async () => {
    const result = await run(["foobar"]);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain("Unknown command");
  });

  it("clean with no pages directory reports no pages", async () => {
    tmpDir = await createTempProject();
    // Pages dir exists but is empty — clean should handle it
    const result = await run(["clean"], { cwd: tmpDir });
    expect(result.code).toBe(0);
    expect(result.stdout).toMatch(/no pages/i);
  });

  it("install-agent --local is idempotent", async () => {
    tmpDir = await createTempProject();

    // First install
    const result1 = await run(["install-agent", "--local"], { cwd: tmpDir });
    expect(result1.code).toBe(0);

    // Second install — should succeed without error
    const result2 = await run(["install-agent", "--local"], { cwd: tmpDir });
    expect(result2.code).toBe(0);

    // Agent file should still exist and be valid
    const agentPath = join(tmpDir, ".claude", "agents", "chat-glass.md");
    const content = await readFile(agentPath, "utf8");
    expect(content.length).toBeGreaterThan(0);
  });
});
