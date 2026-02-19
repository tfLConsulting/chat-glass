# 003 — The `show` Command

## Goal

Build `chat-glass show` — the single magic command the subagent calls. It ensures everything is running and triggers a reload. This is the critical integration point.

## Dependencies on

- 002 (core server)

## Tasks

### 1. Implement `src/commands/show.js`

The command runs this sequence:

```
1. Resolve project directory (cwd)
2. Ensure .chat-glass/pages/ exists
3. Update latest.html symlink → most recent .html file by timestamp
4. Is a server already running for this project?
   ├─ YES: ping GET /reload → done
   └─ NO:
       a. Start server as detached background process
       b. Wait for it to be ready (poll /health, max ~3 seconds)
       c. Open browser to server URL
       d. Ping GET /reload
5. Exit
```

### 2. Server process management

- **Check if running:** Read `.chat-glass/config.json` for port + PID. Hit `GET /health` on that port. If it responds, server is alive. If not (or no config), server is dead.
- **Start as background process:** Spawn a detached child process running the server module. Use `child_process.spawn` with `detached: true`, `stdio: 'ignore'`, `unref()`. The server process outlives the CLI command.
- **Background entry point:** Need a `src/server/start.js` script that can be run as a standalone process — imports `startServer` and calls it with cwd.

### 3. Latest symlink management

- After writing, the subagent's file is the newest in the pages dir
- `show` scans the pages directory, finds the most recent `.html` file (by filename timestamp), creates/updates `latest.html` as a symlink
- Handle edge case: no files in pages dir yet (first run before any visualization is written — but this shouldn't happen since subagent writes first, then calls show)

### 4. Browser opening

- Use `open` npm package to open `http://localhost:{port}` in default browser
- Only open on first server start, not on subsequent reloads (user already has the tab)
- Track "browser opened" state in config

### 5. Error handling

- All ports taken → clear error message: "All ports 3737–3747 in use. Close some chat-glass instances."
- Server fails to start → report error, don't hang
- `/health` check timeout → treat as dead server, start a new one
- Stale config (PID exists but process is dead) → clean up config, start fresh

## Done when

- `chat-glass show` in a project with `.chat-glass/pages/` containing HTML files:
  - Starts a server if none running
  - Opens browser on first start
  - Triggers reload on the running server
  - Returns quickly (< 2 seconds)
- Running `chat-glass show` again reuses the existing server
- After killing the server process manually, `chat-glass show` recovers by starting a new one
