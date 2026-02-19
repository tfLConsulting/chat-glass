# CLAUDE.md

Project-level instructions for developing chat-glass with Claude Code.

## What this project is

chat-glass is an npm package that gives Claude Code the ability to create visual explanations (diagrams, charts, comparisons) served via a local browser viewer.

## Key conventions

- **ESM** -- all source uses `import`/`export` (package.json has `"type": "module"`)
- **No build step** -- source files run directly on Node 18+
- **Minimal dependencies** -- only `ws` and `open` at runtime

## Testing

```bash
npm test
```

Runs vitest. All tests should pass in under 10 seconds.

## Project structure

- `bin/cli.js` -- CLI entry point
- `src/commands/` -- CLI command handlers
- `src/server/` -- HTTP server, WebSocket, routes, file watcher
- `src/utils/` -- Port finder, config, path helpers
- `src/ui/` -- Browser UI HTML files
- `agent/` -- Claude Code subagent file
- `test/` -- Unit, integration, and CLI tests
- `specs/` -- Design specs; `specs/development-history/` has the ordered build plans (001 through 007)

## Development history

The project was built in phases documented in `specs/development-history/`. Each numbered spec describes one phase. Read these to understand architectural decisions.
