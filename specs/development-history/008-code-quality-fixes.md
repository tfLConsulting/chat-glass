# 008 — Code Quality Fixes

## Goal

Fix bugs, clean up code smells, and add defensive error handling. Everything here is a targeted fix — no new features, no refactoring beyond what's needed.

## Dependencies on

- 007 (project is fully built and packaged)

## Tasks

### 1. Fix Node version compatibility bug in CLI tests

**File:** `test/cli/cli.test.js` line 7

`import.meta.dirname` requires Node 21+, but `package.json` declares `engines: ">=18"`. This will fail in CI on Node 18-20.

**Fix:** Replace with the standard ESM pattern:

```js
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const CLI = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "bin", "cli.js");
```

### 2. Consolidate duplicate stdout listener in show.js

**File:** `src/commands/show.js` lines 74-93

Two separate `child.stdout.on("data", ...)` listeners are registered on the same stream. The first (line 74) accumulates into `stdout`, the second (line 87) tries to parse the port on every data event. This is redundant and confusing.

**Fix:** Merge into a single listener that both accumulates and resolves the port:

```js
child.stdout.on("data", (chunk) => {
  stdout += chunk.toString();
  const parsed = parseInt(stdout.trim(), 10);
  if (parsed > 0) {
    clearTimeout(timeout);
    resolvePort(parsed);
  }
});
```

Remove the second listener entirely. This requires hoisting `resolvePort` out of the promise or restructuring the promise slightly so the single listener is set up inside it.

### 3. Combine duplicate path imports in show.js

**File:** `src/commands/show.js` lines 3 and 5

```js
import { resolve } from "node:path";
import { dirname } from "node:path";
```

**Fix:** Combine into one import:

```js
import { resolve, dirname } from "node:path";
```

### 4. Add top-level error handling in CLI

**File:** `bin/cli.js` line 46

`await handler(args.slice(1))` has no try-catch. An unhandled rejection dumps a raw stack trace instead of a clean error message.

**Fix:** Wrap in try-catch:

```js
try {
  await handler(args.slice(1));
} catch (err) {
  console.error(`Error: ${err.message}`);
  process.exit(1);
}
```

### 5. Extract magic numbers to named constants in show.js

**File:** `src/commands/show.js` lines 16, 84, 116-119

Timeouts and retry values are scattered through the file as raw numbers.

**Fix:** Define constants at the top of the file:

```js
const HEALTH_CHECK_TIMEOUT_MS = 2000;
const SERVER_START_TIMEOUT_MS = 5000;
const READY_POLL_INTERVAL_MS = 200;
const READY_MAX_ATTEMPTS = 15;
```

Then reference them in the code.

### 6. Clean up minor code style issues

**list.js line 20-23:** Replace `.sort().reverse()` with a single reverse sort:

```js
.sort((a, b) => b.localeCompare(a))
```

**routes.js line 67:** Add Content-Type header to 405 response:

```js
res.writeHead(405, { "Content-Type": "text/plain" });
```

**routes.js lines 46-57:** The `extractTimestamp` function has a replace callback that returns its input unchanged (the replace is a no-op). Simplify to just return the regex match directly:

```js
function extractTimestamp(filename) {
  const match = filename.match(/^(\d{4}-\d{2}-\d{2}T[\d-]+)/);
  if (match) return match[1];
  const dateMatch = filename.match(/^(\d{4}-\d{2}-\d{2})/);
  return dateMatch ? dateMatch[1] : null;
}
```

## Done when

- All existing tests still pass (`npm test`)
- `cli.test.js` no longer uses `import.meta.dirname`
- `show.js` has a single stdout listener, combined imports, and named constants
- `cli.js` catches and formats errors cleanly
- No functional changes — only code quality improvements
