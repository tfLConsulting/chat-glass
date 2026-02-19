import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { startServer } from "../src/server/index.js";

export async function createTempProject() {
  const tmpDir = await mkdtemp(join(tmpdir(), "chat-glass-test-"));
  const pagesDir = join(tmpDir, ".chat-glass", "pages");
  await mkdir(pagesDir, { recursive: true });
  return tmpDir;
}

export async function writeSamplePage(projectDir, { filename, title, body } = {}) {
  const ts = filename || `${new Date().toISOString().replace(/[:.]/g, "-")}.html`;
  const pageTitle = title || "Test Page";
  const pageBody = body || "<p>Hello</p>";
  const html = `<html><head><title>${pageTitle}</title></head><body>${pageBody}</body></html>`;
  const pagesDir = join(projectDir, ".chat-glass", "pages");
  const filePath = join(pagesDir, ts);
  await writeFile(filePath, html, "utf8");
  return filePath;
}

export async function startTestServer(projectDir) {
  const { port, close } = await startServer(projectDir);
  return { port, close };
}

export async function cleanupTempDir(tmpDir) {
  if (tmpDir && tmpDir.includes("chat-glass-test-")) {
    await rm(tmpDir, { recursive: true, force: true });
  }
}
