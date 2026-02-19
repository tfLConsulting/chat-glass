import { readdir, readFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { pagesDir } from "../utils/paths.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const uiDir = join(__dirname, "..", "ui");

function sendJSON(res, statusCode, data) {
  const body = JSON.stringify(data);
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

function sendHTML(res, statusCode, html) {
  res.writeHead(statusCode, {
    "Content-Type": "text/html; charset=utf-8",
    "Content-Length": Buffer.byteLength(html),
  });
  res.end(html);
}

function send404(res) {
  sendHTML(res, 404, "<h1>404 Not Found</h1>");
}

async function serveUIFile(res, filename) {
  try {
    const html = await readFile(join(uiDir, filename), "utf8");
    sendHTML(res, 200, html);
  } catch {
    sendHTML(res, 200, `<html><body><h1>chat-glass</h1><p>UI not built yet.</p></body></html>`);
  }
}

function extractTitle(html) {
  const match = html.match(/<title>(.*?)<\/title>/i);
  return match ? match[1] : null;
}

function extractTimestamp(filename) {
  const match = filename.match(/^(\d{4}-\d{2}-\d{2}T[\d-]+)/);
  if (match) return match[1];
  const dateMatch = filename.match(/^(\d{4}-\d{2}-\d{2})/);
  return dateMatch ? dateMatch[1] : null;
}

export function createRouter(projectDir, { broadcast, touchActivity, serverInfo }) {
  const pages = pagesDir(projectDir);

  return async function handleRequest(req, res) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const path = url.pathname;

    if (req.method !== "GET") {
      res.writeHead(405, { "Content-Type": "text/plain" });
      res.end("Method Not Allowed");
      return;
    }

    // GET /
    if (path === "/") {
      await serveUIFile(res, "main.html");
      return;
    }

    // GET /gallery
    if (path === "/gallery") {
      await serveUIFile(res, "gallery.html");
      return;
    }

    // GET /reload
    if (path === "/reload") {
      touchActivity();
      broadcast(JSON.stringify({ type: "reload" }));
      sendJSON(res, 200, { ok: true });
      return;
    }

    // GET /health
    if (path === "/health") {
      const info = serverInfo();
      sendJSON(res, 200, {
        port: info.port,
        pid: process.pid,
        uptime: Math.floor((Date.now() - info.startedAt) / 1000),
      });
      return;
    }

    // GET /api/pages
    if (path === "/api/pages") {
      try {
        const files = await readdir(pages);
        const htmlFiles = files.filter(
          (f) => extname(f) === ".html" && f !== "latest.html"
        );

        const results = await Promise.all(
          htmlFiles.map(async (filename) => {
            let title = null;
            try {
              const content = await readFile(join(pages, filename), "utf8");
              title = extractTitle(content);
            } catch {
              // ignore unreadable files
            }
            const timestamp = extractTimestamp(filename);
            return { filename, title, timestamp };
          })
        );

        // Sort by filename descending (newest first, assuming timestamp-based names)
        results.sort((a, b) => b.filename.localeCompare(a.filename));
        sendJSON(res, 200, results);
      } catch {
        sendJSON(res, 200, []);
      }
      return;
    }

    // GET /pages/:filename
    if (path.startsWith("/pages/")) {
      const filename = path.slice("/pages/".length);
      // Prevent path traversal
      if (filename.includes("..") || filename.includes("/")) {
        send404(res);
        return;
      }
      try {
        const html = await readFile(join(pages, filename), "utf8");
        sendHTML(res, 200, html);
      } catch {
        send404(res);
      }
      return;
    }

    send404(res);
  };
}
