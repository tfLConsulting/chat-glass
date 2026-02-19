# 010 — Screenshot Capture

## Goal

Give the agent a visual feedback loop. After a visualization is rendered in the browser, capture a screenshot and return its path so the calling context (Claude Code) can see what the user sees. This enables iteration — "make the boxes blue" has visual grounding.

The feature must degrade gracefully. If `puppeteer-core` is unavailable or Chrome can't be found or the capture times out, the visualization still works exactly as before — no screenshot is returned, no error is thrown.

## Dependencies on

- 004 (browser UI — needs to signal render completion)
- 003 (show command — screenshot is taken after show completes)

## Design decisions

**Why puppeteer-core (not html2canvas, not platform screencapture):**
- Pixel-perfect rendering of any content type — SVG diagrams, HTML tables, styled comparisons
- No client-side dependencies added to the browser UI
- `puppeteer-core` has no bundled Chromium — uses whatever Chrome is already installed
- Server-side capture keeps the UI clean and simple

**Graceful degradation strategy:**
- Dynamic `import('puppeteer-core')` wrapped in try/catch
- If import fails → log debug message, return no screenshot path
- If Chrome executable not found → same
- If capture times out → same
- The `show()` function's return value gains an optional `screenshot` field

## Tasks

### 1. Add `puppeteer-core` as a dependency

Add to `dependencies` in `package.json`:

```json
"puppeteer-core": "^24.0.0"
```

### 2. Add Chrome finder utility (`src/utils/find-chrome.js`)

A small helper that returns the Chrome/Chromium executable path or `null`.

Check platform-specific default locations:
- **macOS:** `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`
- **Linux:** `/usr/bin/google-chrome`, `/usr/bin/chromium-browser`, `/usr/bin/chromium`
- **Windows:** `C:\Program Files\Google\Chrome\Application\chrome.exe`, `C:\Program Files (x86)\Google\Chrome\Application\chrome.exe`

Check each path with `fs.access()`. Return the first one that exists, or `null`.

```js
export async function findChrome() { ... }
```

### 3. Add "render complete" WebSocket message from browser UI

The browser UI needs to signal when the visualization has finished rendering. This is critical for knowing when to take the screenshot.

**In the browser UI JavaScript:**
- After the page content loads (including async renders like Mermaid), send a WebSocket message: `{ type: "render-complete" }`
- Use a heuristic: wait for `DOMContentLoaded`, then wait an additional tick for Mermaid/D3/Chart.js to finish rendering (a short `setTimeout` of ~500ms as a pragmatic catch-all)

**In the WebSocket server (`src/server/`):**
- Listen for `render-complete` messages from clients
- Expose a way to await this signal (a promise that resolves when the message arrives)

### 4. Implement screenshot capture (`src/utils/screenshot.js`)

```js
export async function captureScreenshot(port, outputPath) { ... }
```

**Flow:**
1. Dynamic `import('puppeteer-core')` — if it fails, return `null`
2. Call `findChrome()` — if it returns `null`, return `null`
3. Launch headless browser pointing at the found Chrome executable
4. Navigate to `http://localhost:{port}`
5. Set viewport to 1200x800 (matches the visualization target viewport)
6. Wait for page load + a short settle time
7. Take a full-page screenshot, save to `outputPath` as PNG
8. Close the browser
9. Return the output path

**Timeout:** Wrap the entire operation in a timeout (5 seconds). If it exceeds this, clean up and return `null`.

**Error handling:** Every step is wrapped so that any failure at any point results in cleanup and a `null` return, never a thrown error.

### 5. Integrate into the `show()` function

Modify `src/commands/show.js`:

After the reload ping (step 7 in the current flow), add a screenshot step:

```js
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
```

The `screenshot` field is either an absolute path to the PNG or `null`.

### 6. Update the agent definition

Modify `agent/chat-glass.md` to instruct the subagent about the screenshot return:

- After running `chat-glass show`, the agent should note that a screenshot path may be available
- Update the example workflow to show the new return shape
- The agent's reply should include the screenshot path if available, so the calling context can read the image

Specifically, update the output rules and example workflow:

**Output rules addition:**
```
6. If `chat-glass show` outputs a screenshot path, include it in your response
   as: "Screenshot: /path/to/screenshot.png" — this lets the calling context
   see what was rendered.
```

### 7. Expose screenshot path from CLI

Update `showCommand()` in `src/commands/show.js` to print the screenshot path when available:

```js
if (screenshot) {
  console.log(`screenshot: ${screenshot}`);
}
```

This gives the agent a parseable line to extract the path from.

### 8. Tests

**Unit test `test/unit/find-chrome.test.js`:**
- Mock `fs.access` to simulate Chrome found / not found
- Verify it returns the correct path on each platform
- Verify it returns `null` when no Chrome is installed

**Unit test `test/unit/screenshot.test.js`:**
- Mock `puppeteer-core` import failure → returns `null`
- Mock `findChrome` returning `null` → returns `null`
- Mock timeout exceeded → returns `null`, no hanging promises
- Verify cleanup (browser.close) is always called, even on failure

**Integration test `test/integration/screenshot.test.js`:**
- If puppeteer-core is available and Chrome is installed:
  - Start a server with a test HTML page
  - Call `captureScreenshot(port, tmpPath)`
  - Verify the PNG file exists and has non-zero size
- If puppeteer-core is not available:
  - Verify `captureScreenshot` returns `null` without throwing

## Done when

- `puppeteer-core` is in `dependencies`
- `findChrome()` locates Chrome on macOS, Linux, and Windows (or returns `null`)
- `captureScreenshot()` produces a PNG of the rendered visualization
- `show()` returns `{ port, isNew, screenshot }` where `screenshot` is a path or `null`
- The CLI prints the screenshot path when available
- The agent definition instructs the subagent to surface the screenshot path
- Every failure mode (no puppeteer-core, no Chrome, timeout, render error) degrades silently — no thrown errors, no broken visualizations
- All new code has tests
- `npm test` passes in under 10 seconds
