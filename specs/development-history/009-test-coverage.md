# 009 — Test Coverage Hardening

## Goal

Close the test coverage gaps identified in review. The `show` command — the project's entire critical path — has zero coverage. Route-level edge cases (path traversal, 404s, 405s) are untested. Error recovery paths are uncovered. An exemplar project needs tests that prove the hard stuff works, not just the easy stuff.

## Dependencies on

- 008 (code quality fixes applied first — especially the show.js refactoring)

## Tasks

### 1. Make the show command testable

The `show` command currently can't be tested because it:
- Calls `process.exit()` directly (lines 159, 162, 169) — kills the test process
- Calls `open()` to launch a browser — side effect in tests
- Uses `getProjectDir()` which returns `process.cwd()` — not injectable

**Refactor the `show` function to accept dependencies and return results instead of exiting:**

```js
export async function show(projectDir, { openBrowser = true } = {}) {
  // ... all existing logic ...
  // Instead of process.exit(1), throw an error
  // Instead of unconditional open(), check openBrowser flag
  // Accept projectDir as parameter instead of calling getProjectDir()
  return { port, isNew };
}
```

Keep the default export as a thin wrapper for CLI use:

```js
export default async function showCommand() {
  try {
    const { port } = await show(getProjectDir());
    console.log(`chat-glass running on http://localhost:${port}`);
  } catch (err) {
    if (err.message.includes("No free port")) {
      console.error("All ports 3737-3747 in use. Close some chat-glass instances.");
    } else {
      console.error(`Failed to start server: ${err.message}`);
    }
    process.exit(1);
  }
}
```

This lets tests call `show(tmpDir, { openBrowser: false })` directly.

### 2. Show command integration tests (`test/integration/show.test.js`)

**Starts a server when none is running:**
- Call `show(tmpDir, { openBrowser: false })`
- Verify it returns a port in range 3737-3747
- Verify the server responds to `/health`
- Clean up: kill the spawned server process via the returned port/config

**Detects existing server and pings reload:**
- Start a server manually with `startServer(tmpDir)`
- Call `show(tmpDir, { openBrowser: false })`
- Verify it reuses the same port (doesn't spawn a second server)
- Verify reload was triggered (connect a WebSocket client before calling show, assert it receives a reload message)

**Recovers from stale config (dead PID):**
- Write a config with a fake PID (e.g., 999999) and a port
- Call `show(tmpDir, { openBrowser: false })`
- Verify it starts a fresh server (ignores the stale config)
- Verify the new server is healthy

**Creates directories if missing:**
- Create a bare temp dir (no `.chat-glass/` subdirectory)
- Call `show(tmpDir, { openBrowser: false })`
- Verify `.chat-glass/pages/` was created

**Updates latest.html symlink:**
- Write two sample pages with ordered timestamps
- Call `show(tmpDir, { openBrowser: false })`
- Verify `latest.html` symlink points to the newer file

**Clean up strategy:** Each test needs to kill any spawned server. After `show()` returns a port, read the config to get the PID, then `process.kill(pid)`. Or hit the server's close endpoint. Add a helper for this.

### 3. Route-level tests (`test/integration/routes.test.js`)

These test the HTTP routes directly using a real server started with `startTestServer()`.

**Path traversal prevention:**
- `GET /pages/../../etc/passwd` returns 404
- `GET /pages/foo/../bar.html` returns 404
- `GET /pages/subdir/file.html` returns 404 (contains `/`)

**404 for unknown routes:**
- `GET /nonexistent` returns 404
- Verify response body contains "404"

**405 for non-GET methods:**
- `POST /health` returns 405
- `PUT /reload` returns 405

**Main view and gallery serve HTML:**
- `GET /` returns 200 with HTML containing "chat-glass"
- `GET /gallery` returns 200 with HTML

**API pages with no pages:**
- `GET /api/pages` with empty pages dir returns `[]`

**API pages excludes latest.html:**
- Write a page and create a `latest.html` symlink
- `GET /api/pages` returns only the real page, not `latest.html`

### 4. Edge case tests

**Corrupt config recovery** (`test/unit/config.test.js`):
- Write invalid JSON to the config file
- Call `readConfig()` — verify it returns defaults without throwing

**Port exhaustion** (`test/unit/port.test.js`):
- Bind servers to all 11 ports (3737-3747)
- Call `findFreePort()` — verify it throws with the expected error message
- Clean up: close all 11 servers

**Watcher cleanup** (`test/integration/watcher.test.js`):
- Create a watcher, call `close()`
- Write a file — verify the callback is NOT called

**Multiple WebSocket clients** (`test/integration/websocket.test.js`):
- Connect two WebSocket clients
- Hit `/reload`
- Verify both clients receive the reload message

**Graceful shutdown assertion** (`test/integration/server.test.js`):
- Tighten the existing shutdown test to check for `ECONNREFUSED` specifically:
  ```js
  expect(err.cause?.code).toBe("ECONNREFUSED");
  ```

### 5. CLI tests for uncovered commands (`test/cli/cli.test.js`)

**Unknown command:**
- Run `chat-glass foobar`
- Verify exit code is 1
- Verify stderr contains "Unknown command"

**Clean with no pages:**
- Run `chat-glass clean` in an empty project
- Verify it reports "No pages" (not an error)

**Install-agent idempotency:**
- Run `chat-glass install-agent --local` twice
- Verify second run says "already up to date" (or similar)

### 6. Add vitest coverage configuration

Add coverage config to `vitest.config.js`:

```js
export default defineConfig({
  test: {
    fileParallelism: false,
    testTimeout: 10000,
    coverage: {
      provider: "v8",
      include: ["src/**"],
      exclude: ["src/ui/**"],
    },
  },
});
```

Add a `test:coverage` script to `package.json`:

```json
"test:coverage": "vitest run --coverage"
```

The `src/ui/` directory is excluded because those are HTML files served to the browser, not testable server code.

## Done when

- `npm test` passes with all new tests
- The `show` command has integration tests covering: fresh start, reuse, stale config recovery, directory creation, symlink update
- Route tests cover: path traversal, 404, 405, main view, gallery, empty pages
- Edge cases covered: corrupt config, port exhaustion, watcher cleanup, multi-client broadcast
- CLI tests cover: unknown command, clean-no-pages, install-agent idempotency
- `npm run test:coverage` works and shows coverage report
- Tests complete in under 10 seconds
- No flaky tests (no bare timing assumptions — use polling/retries where needed)
