import { watch } from "node:fs";
import { pagesDir } from "../utils/paths.js";

export function createWatcher(projectDir, onChange) {
  const dir = pagesDir(projectDir);
  let debounceTimer = null;
  let watcher = null;

  function start() {
    try {
      watcher = watch(dir, { persistent: false }, (_event, filename) => {
        // Only react to HTML file changes — ignore screenshots, temp files, etc.
        if (filename && !filename.endsWith(".html")) return;
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          debounceTimer = null;
          onChange();
        }, 100);
      });

      watcher.on("error", (err) => {
        // Directory may be deleted and recreated — restart watcher
        close();
        setTimeout(() => {
          try {
            start();
          } catch {
            // directory doesn't exist yet, will retry on next change
          }
        }, 1000);
      });
    } catch {
      // directory doesn't exist yet — that's fine
    }
  }

  function close() {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    if (watcher) {
      watcher.close();
      watcher = null;
    }
  }

  start();

  return { close };
}
