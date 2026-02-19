# Contributing to chat-glass

## Setup

```bash
git clone https://github.com/tfLConsulting/chat-glass.git
cd chat-glass
npm install
```

## Running tests

```bash
npm test
```

All tests should pass in under 10 seconds. Tests create temporary directories and start/stop servers -- they clean up after themselves.

## Code style

- **ESM only** -- use `import`/`export`, not `require`/`module.exports`
- **Minimal dependencies** -- avoid adding dependencies unless truly necessary
- **Node built-ins first** -- prefer `node:fs`, `node:path`, `node:http` over npm packages
- **No build step** -- source files run directly on Node

## Project structure

```
bin/cli.js           # CLI entry point
src/
  index.js           # Public API exports
  commands/          # CLI command handlers (show, list, clean, install-agent)
  server/            # HTTP server, WebSocket, file watcher, routes
  utils/             # Port finder, config read/write, path helpers
  ui/                # Browser UI (main view, gallery)
agent/               # Claude Code agent file
test/
  helpers.js         # Test utilities (temp dirs, sample pages, server helpers)
  unit/              # Unit tests for utils
  integration/       # Server, WebSocket, and watcher tests
  cli/               # CLI smoke tests
specs/               # Design specs and development history
```

## Pull requests

- Keep PRs focused -- one feature or fix per PR
- Add tests for new functionality
- Make sure `npm test` passes before submitting
- Describe what changed and why in the PR description
