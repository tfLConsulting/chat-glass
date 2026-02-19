# 001 — Project Scaffolding

## Goal

Set up the npm package structure, tooling, and directory layout so everything that follows has a solid foundation.

## Tasks

### 1. Initialize npm package

- `npm init` with:
  - name: `chat-glass`
  - version: `0.1.0`
  - description: "Visual thinking companion for Claude Code"
  - license: MIT
  - main: `src/index.js`
  - bin: `{ "chat-glass": "./bin/cli.js" }`
  - type: `module` (ESM)

### 2. Create directory structure

```
chat-glass/
├── bin/
│   └── cli.js              # Entry point, arg parsing, routes to commands
├── src/
│   ├── commands/
│   │   ├── show.js          # The magic command
│   │   ├── install-agent.js # Install agent file to .claude/agents/
│   │   ├── list.js          # List visualizations
│   │   └── clean.js         # Delete all pages
│   ├── server/
│   │   ├── index.js         # HTTP + WebSocket server
│   │   ├── routes.js        # Route handlers
│   │   └── watcher.js       # fs.watch setup
│   ├── ui/
│   │   ├── main.html        # Main view template
│   │   └── gallery.html     # Gallery view template
│   └── utils/
│       ├── config.js        # Read/write .chat-glass/config.json
│       ├── paths.js         # Resolve .chat-glass/ paths
│       └── port.js          # Find free port in range
├── agent/
│   └── chat-glass.md        # The subagent definition (source of truth)
├── test/
│   └── (later)
├── specs/
├── adhoc/
├── package.json
├── LICENSE
├── README.md
└── .gitignore
```

### 3. Install dev dependencies

- `vitest` — test runner
- `ws` — WebSocket library
- `open` — cross-platform browser opening

### 4. Create .gitignore

```
node_modules/
.chat-glass/
.DS_Store
```

### 5. Create LICENSE (MIT)

Standard MIT license.

### 6. Create minimal bin/cli.js

A stub that parses the first argument and routes to the right command module. Use no CLI framework — just `process.argv`. Commands: `show`, `install-agent`, `list`, `clean`. Unknown command or `--help` prints usage.

### 7. Verify

- `node bin/cli.js --help` prints usage
- `npm test` runs (even if no tests yet)
- `npm link` makes `chat-glass` available globally for local dev

## Done when

- Running `chat-glass --help` prints a usage message
- Directory structure is in place with stub files
- `npm test` exits cleanly
