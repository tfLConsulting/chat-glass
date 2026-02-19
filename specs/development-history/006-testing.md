# 006 — Testing

## Goal

Reliable test suite that runs with a single `npm test`. Covers the critical paths so we can ship with confidence and refactor without fear.

## Dependencies on

- 002, 003, 004, 005 (all components built)

## Tasks

### 1. Test infrastructure

- Vitest configured in `package.json` or `vitest.config.js`
- `npm test` runs all tests
- Tests should be fast (< 10 seconds total)
- Each test that starts a server must clean up after itself (close server, remove temp files)

### 2. Unit tests (`test/unit/`)

**Port utilities:**
- `findFreePort()` returns a port in the expected range
- `findFreePort()` skips ports that are in use

**Config utilities:**
- `readConfig()` returns defaults when no config exists
- `writeConfig()` creates the file and parent dirs
- Round-trip: write then read returns same data

**Path utilities:**
- `pagesDir()` resolves correctly relative to project dir
- `latestPath()` resolves correctly

### 3. Integration tests (`test/integration/`)

**Server lifecycle:**
- Server starts and responds to `/health`
- Server serves static HTML files from pages directory
- `GET /reload` returns 200 and triggers WebSocket message
- `GET /api/pages` returns correct JSON listing
- Server shuts down after idle timeout (use short timeout in test, e.g. 2 seconds)
- Server handles graceful shutdown (close connections, clean up)

**WebSocket:**
- Client connects to `/ws`
- Client receives reload message when `/reload` is hit
- Client receives reload message when file is written to pages dir

**File watcher:**
- Writing a new file to pages dir triggers the callback
- Debouncing works (rapid writes produce single callback)

**Show command:**
- Starts a server when none is running
- Detects existing server and pings reload
- Recovers from stale config (dead PID)
- Creates directories if missing

### 4. CLI smoke tests (`test/cli/`)

- `chat-glass --help` exits 0 and prints usage
- `chat-glass show` in a temp directory starts a server
- `chat-glass list` with no pages reports empty
- `chat-glass list` with pages reports them
- `chat-glass clean` removes pages
- `chat-glass install-agent` copies the agent file

### 5. Test utilities

- Helper to create a temp project directory with `.chat-glass/pages/`
- Helper to write a sample HTML page with a given timestamp
- Helper to start/stop server for integration tests
- Cleanup hooks to kill any stray server processes

## Done when

- `npm test` runs all tests and passes
- Tests complete in under 10 seconds
- No stray processes or temp files left after tests
- Tests are reliable (no flaky timing issues)
