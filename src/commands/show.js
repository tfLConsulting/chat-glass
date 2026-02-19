import { spawn } from "node:child_process";
import { readdir, symlink, unlink } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readConfig, ensureDirs, writeConfig } from "../utils/config.js";
import { pagesDir, latestPath, getProjectDir } from "../utils/paths.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SERVER_ENTRY = resolve(__dirname, "..", "server", "start.js");

const HEALTH_CHECK_TIMEOUT_MS = 2000;
const SERVER_START_TIMEOUT_MS = 5000;
const READY_POLL_INTERVAL_MS = 200;
const READY_MAX_ATTEMPTS = 15;

async function isServerAlive(port) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT_MS);
    const res = await fetch(`http://127.0.0.1:${port}/health`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
}

function isProcessAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function updateLatestSymlink(projectDir) {
  const dir = pagesDir(projectDir);
  let files;
  try {
    files = await readdir(dir);
  } catch {
    return;
  }

  const htmlFiles = files
    .filter((f) => f.endsWith(".html") && f !== "latest.html")
    .sort();

  if (htmlFiles.length === 0) return;

  const newest = htmlFiles[htmlFiles.length - 1];
  const linkPath = latestPath(projectDir);

  // Remove existing symlink/file
  try {
    await unlink(linkPath);
  } catch {
    // doesn't exist yet
  }

  await symlink(newest, linkPath);
}

async function spawnServer(projectDir) {
  const child = spawn(process.execPath, [SERVER_ENTRY, projectDir], {
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
  });

  // Read the port from stdout
  let stdout = "";
  let stderr = "";

  // Wait for the server to write its port, or fail
  const port = await new Promise((resolvePort, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Server failed to start within 5 seconds"));
    }, SERVER_START_TIMEOUT_MS);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
      const parsed = parseInt(stdout.trim(), 10);
      if (parsed > 0) {
        clearTimeout(timeout);
        resolvePort(parsed);
      }
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    child.on("exit", (code) => {
      if (code !== null && code !== 0) {
        clearTimeout(timeout);
        reject(new Error(stderr.trim() || `Server exited with code ${code}`));
      }
    });
  });

  // Detach — let the server run independently
  child.unref();
  child.stdout.destroy();
  child.stderr.destroy();

  return port;
}

async function waitForReady(port, maxAttempts = READY_MAX_ATTEMPTS) {
  for (let i = 0; i < maxAttempts; i++) {
    if (await isServerAlive(port)) return true;
    await new Promise((r) => setTimeout(r, READY_POLL_INTERVAL_MS));
  }
  return false;
}

export async function show(projectDir, { openBrowser = true } = {}) {
  // 1. Ensure directories exist
  await ensureDirs(projectDir);

  // 2. Update latest.html symlink
  await updateLatestSymlink(projectDir);

  // 3. Check if server is already running
  const config = await readConfig(projectDir);
  let port = config.port;
  let isNew = false;

  let alive = false;
  if (port && config.pid) {
    // Check if the process is still alive and responding
    if (isProcessAlive(config.pid)) {
      alive = await isServerAlive(port);
    }
    // Stale config — process is dead
    if (!alive) {
      port = null;
    }
  }

  if (!alive) {
    // 4. Start server as background process
    port = await spawnServer(projectDir);

    // 5. Wait for server to be ready
    const ready = await waitForReady(port);
    if (!ready) {
      throw new Error("Server started but failed to respond");
    }

    isNew = true;
  }

  // 6. Open browser on first start
  if (isNew && openBrowser) {
    try {
      const open = (await import("open")).default;
      await open(`http://localhost:${port}`);
    } catch {
      // Non-fatal — headless environments may not have a browser
    }

    // Track that browser was opened
    const currentConfig = await readConfig(projectDir);
    await writeConfig(projectDir, { ...currentConfig, browserOpened: true });
  }

  // 7. Ping reload
  try {
    await fetch(`http://127.0.0.1:${port}/reload`);
  } catch {
    // Non-fatal
  }

  // 8. Attempt screenshot capture
  let screenshot = null;
  try {
    const { captureScreenshot } = await import("../utils/screenshot.js");
    const outputFile = resolve(pagesDir(projectDir), `screenshot-${Date.now()}.png`);
    screenshot = await captureScreenshot(port, outputFile);
  } catch {
    // Non-fatal — screenshot is a bonus
  }

  return { port, isNew, screenshot };
}

export default async function showCommand() {
  try {
    const projectDir = getProjectDir();
    const { port, screenshot } = await show(projectDir);
    console.log(`chat-glass running on http://localhost:${port}`);
    if (screenshot) {
      console.log(`screenshot: ${screenshot}`);
    }
  } catch (err) {
    if (err.message.includes("No free port")) {
      console.error(
        "All ports 3737-3747 in use. Close some chat-glass instances."
      );
    } else {
      console.error(`Failed to start server: ${err.message}`);
    }
    process.exit(1);
  }
}
