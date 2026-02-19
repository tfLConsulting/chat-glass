# 002 — Core Server

## Goal

Build the HTTP + WebSocket server that serves visualizations and handles live reload. This is the engine — no CLI wiring yet, just the server module that can be started programmatically.

## Dependencies on

- 001 (project scaffolding)

## Tasks

### 1. Port allocation (`src/utils/port.js`)

- Function `findFreePort()`: scan ports 3737–3747, return first available
- Use `net.createServer().listen()` to test availability
- Throw clear error if all ports taken

### 2. Config management (`src/utils/config.js`)

- `readConfig(projectDir)` — read `.chat-glass/config.json`, return parsed object or defaults
- `writeConfig(projectDir, config)` — write config atomically
- Config shape: `{ port, pid, lastActivity, createdAt }`
- `ensureDirs(projectDir)` — create `.chat-glass/pages/` if missing

### 3. Path utilities (`src/utils/paths.js`)

- `pagesDir(projectDir)` — resolve `.chat-glass/pages/`
- `configPath(projectDir)` — resolve `.chat-glass/config.json`
- `latestPath(projectDir)` — resolve `.chat-glass/pages/latest.html`
- `getProjectDir()` — return cwd (the project root)

### 4. File watcher (`src/server/watcher.js`)

- Watch `.chat-glass/pages/` with `fs.watch`
- Debounce events (100ms) — coalesce rapid duplicate events
- On change: call a provided callback (will be wired to WebSocket broadcast)
- Handle watcher errors gracefully (directory deleted and recreated, etc.)

### 5. HTTP + WebSocket server (`src/server/index.js`)

- Create HTTP server using `node:http`
- Attach `ws` WebSocket server on `/ws` path
- Track connected WebSocket clients
- `broadcast(message)` — send to all connected clients
- Wire watcher callback to broadcast `{ type: "reload" }`

### 6. Route handlers (`src/server/routes.js`)

| Route | Handler |
|-------|---------|
| `GET /` | Serve main view HTML (inline, from template) |
| `GET /gallery` | Serve gallery view HTML |
| `GET /pages/:filename` | Serve static HTML files from pages directory |
| `GET /reload` | Trigger broadcast, return 200. Update lastActivity. |
| `GET /api/pages` | Return JSON list of all pages (filename, title, timestamp) for the UI to consume |
| `GET /health` | Return 200 + JSON with port, pid, uptime. Used by `show` to check if server is alive. |

### 7. Auto-shutdown

- Track `lastActivity` timestamp (updated on: reload request, file change, WebSocket connection)
- Check every 60 seconds: if `lastActivity` older than 30 minutes, shut down gracefully
- On shutdown: close WebSocket connections, close HTTP server, remove PID from config

### 8. Server start function

- `startServer(projectDir)` — exported function that:
  1. Ensures dirs exist
  2. Finds free port
  3. Starts HTTP + WS server
  4. Starts file watcher
  5. Starts auto-shutdown timer
  6. Writes config (port, PID)
  7. Returns `{ port, close }` for testing

## Done when

- Server can be started programmatically in a test
- `GET /health` returns valid JSON
- `GET /reload` triggers a WebSocket message to connected clients
- File changes in the pages directory trigger WebSocket messages
- Server shuts down after idle period (testable with short timeout)
