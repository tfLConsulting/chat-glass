import { describe, it, expect, afterEach } from "vitest";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createWatcher } from "../../src/server/watcher.js";
import { createTempProject, cleanupTempDir } from "../helpers.js";

describe("watcher", () => {
  let tmpDir;
  let watcher;

  afterEach(async () => {
    if (watcher) {
      watcher.close();
      watcher = null;
    }
    if (tmpDir) {
      await cleanupTempDir(tmpDir);
      tmpDir = null;
    }
  });

  it("writing a new file to pages dir triggers the callback", async () => {
    tmpDir = await createTempProject();

    let called = false;
    const onChange = () => { called = true; };
    watcher = createWatcher(tmpDir, onChange);

    const pagesDir = join(tmpDir, ".chat-glass", "pages");
    await writeFile(join(pagesDir, "trigger.html"), "<html></html>", "utf8");

    // Wait for debounce (100ms) + buffer
    await new Promise((r) => setTimeout(r, 400));
    expect(called).toBe(true);
  });

  it("debouncing works — rapid writes produce single callback", async () => {
    tmpDir = await createTempProject();

    let callCount = 0;
    const onChange = () => { callCount++; };
    watcher = createWatcher(tmpDir, onChange);

    const pagesDir = join(tmpDir, ".chat-glass", "pages");
    // Write several files in rapid succession (within debounce window)
    for (let i = 0; i < 5; i++) {
      await writeFile(join(pagesDir, `rapid-${i}.html`), `<html>${i}</html>`, "utf8");
    }

    // Wait for debounce to settle
    await new Promise((r) => setTimeout(r, 400));
    expect(callCount).toBe(1);
  });

  it("close() stops the watcher — no callback after close", async () => {
    tmpDir = await createTempProject();

    let called = false;
    const onChange = () => { called = true; };
    watcher = createWatcher(tmpDir, onChange);

    // Close the watcher
    watcher.close();
    watcher = null;

    // Write a file — should NOT trigger the callback
    const pagesDir = join(tmpDir, ".chat-glass", "pages");
    await writeFile(join(pagesDir, "after-close.html"), "<html></html>", "utf8");

    // Wait longer than debounce
    await new Promise((r) => setTimeout(r, 400));
    expect(called).toBe(false);
  });
});
