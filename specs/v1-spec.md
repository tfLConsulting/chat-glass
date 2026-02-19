# chat-glass v1 — Specification

> Visual Thinking Companion for Claude Code
> A lightweight system that lets Claude Code push visual explanations to a persistent browser window. Claude decides when a visual would help, a subagent generates standalone HTML, and a tiny local server displays it with hot reload and a gallery of all previous visualizations.

## Architecture

```
┌─────────────────────┐
│  Main Claude Code    │  (decides a visual would help)
│  (your conversation) │───────────────────────┐
└─────────────────────┘                        │
                                               ▼
                             ┌──────────────────────────────┐
                             │  chat-glass subagent          │
                             │  (fresh context)              │
                             │                               │
                             │  1. Receives: natural language │
                             │  2. Produces: standalone HTML  │
                             │  3. Writes to: .chat-glass/   │
                             │     pages/{timestamp}.html     │
                             │  4. Runs: chat-glass show      │
                             │  5. Returns: one-line summary  │
                             └──────────────┬────────────────┘
                                            │
                              chat-glass show handles everything:
                              - creates dirs if needed
                              - starts server if not running
                              - opens browser if not open
                              - triggers reload via HTTP + fs.watch
                                            │
                                            ▼
                             ┌──────────────────────────────┐
                             │  Browser tab                  │
                             │  (appears automatically)      │
                             │                               │
                             │  Latest visualization          │
                             │  Gallery of previous ones      │
                             │  Keyboard navigation           │
                             └──────────────────────────────┘
```

## Core Principle

**Everything is magic.** The user never starts a server, never opens a browser tab, never manages files. Claude decides to show something, and it appears. The system starts up lazily on first use and shuts down when idle.

## Components

### 1. The Subagent — `.claude/agents/chat-glass.md`

A Claude Code agent file (Markdown with YAML frontmatter).

**Frontmatter:**

```yaml
---
name: chat-glass
description: >
  Use this agent whenever a visual explanation would be clearer than text.
  Comparisons, architectures, flows, data, relationships, tradeoffs,
  layouts, timelines, hierarchies — any time showing is better than telling.
  Be proactive: if something would benefit from a visual, use this without
  being asked.
tools: Write, Bash
---
```

**Key behaviors (defined in the agent's system prompt body):**

- Receives a plain-English description of what to visualize
- Generates a single, self-contained HTML file (inline CSS, inline JS, CDN libraries as needed)
- Writes the file to `.chat-glass/pages/{ISO-timestamp}.html`
- Runs `chat-glass show` (which handles server, browser, reload — everything)
- Returns a single sentence to the main agent describing what was visualized — nothing more
- **Never returns HTML to the main agent.** Writes to disk only.

**Model:** Not hardcoded. The calling Claude instance decides. The agent file should not specify a `model` field, allowing it to inherit from the caller or be overridden at invocation time.

**Style guide (included in the agent's system prompt):**

The subagent produces visualizations that feel like a thoughtful colleague sketched something on a whiteboard — clear, purposeful, not over-designed.

- **Dark theme.** Background: `#1a1a2e` or similar deep blue-black. Text: `#e0e0e0`. Accent: rotate through a palette (`#00d4ff`, `#ff6b6b`, `#4ecdc4`, `#ffe66d`, `#a29bfe`).
- **Typography.** System font stack for body (`-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`). For headings or labels that need character, pull a single Google Font via CDN — vary it per visualization.
- **Layout.** Generous whitespace. Content centered with max-width ~1000px. CSS grid/flexbox. No scrolling if possible — fit the viewport.
- **Diagrams.** Prefer organic SVG feel over rigid boxes. Rounded corners, subtle shadows, curved connecting lines.
- **Comparisons.** Side-by-side cards with clear headers, key points, color-coded borders for pros/cons.
- **Flows.** Nodes as rounded rectangles, edges as curved SVG paths with arrowheads. Subtle load animation if it aids understanding.
- **No chartjunk.** Every visual element earns its place. No decorative gradients, no 3D effects.

**CDN libraries — use freely:**

The subagent should prefer CDN libraries over hand-rolling equivalent functionality. Recommended:

| Library | Use case |
|---------|----------|
| Tailwind CSS | Quick styling without boilerplate |
| Mermaid | Diagrams from text definitions |
| D3.js | Custom data visualizations |
| Chart.js | Simple charts |
| Prism.js / Highlight.js | Syntax-highlighted code blocks |
| KaTeX | Math and equations |
| Three.js | 3D visualizations |

This is not a closed list. The subagent can use any CDN-hosted library that fits the task.

### 2. The CLI / Server — `chat-glass`

An npm package installed globally (`npm i -g chat-glass`).

#### CLI Commands

| Command | Purpose |
|---------|---------|
| `chat-glass install-agent` | One-time setup: installs the agent file to `~/.claude/agents/` (user-level, all projects) or `.claude/agents/` (project-level, with `--local` flag) |
| `chat-glass show` | The main command. Ensures everything is running, triggers a reload. Called by the subagent after writing a file. |
| `chat-glass list` | List all saved visualizations with timestamps |
| `chat-glass clean` | Delete all pages, start fresh |

**Commands that don't exist:** `init`, `serve`, `stop`, `open`. These are all handled automatically.

#### `chat-glass show` — The Magic Command

This is the only command the subagent calls. It handles the full lifecycle:

1. **Ensure directories exist.** Create `.chat-glass/pages/` in the current working directory if missing.
2. **Ensure config exists.** Create `.chat-glass/config.json` if missing (stores allocated port, timestamps).
3. **Ensure server is running.** Check if a server is already running for this project directory.
   - If yes: send an HTTP reload ping to it.
   - If no: start a server in the background, find a free port (scan 3737–3747), save port to config, then send the reload ping.
4. **Ensure browser is open.** If the server was just started, open the browser to the server URL.
5. **Update latest symlink.** Point `.chat-glass/pages/latest.html` to the most recent file.
6. **Exit.** The command returns quickly — the server runs in the background.

#### Server Behavior

A Node.js HTTP + WebSocket server running in the background.

**Startup:**
- Bind to a free port in range 3737–3747
- Save port and PID to `.chat-glass/config.json`
- Start watching `.chat-glass/pages/` with `fs.watch` (debounced, ~100ms)

**Reload triggers (belt and suspenders):**
- **Primary:** HTTP `GET /reload` endpoint — the `chat-glass show` command hits this
- **Secondary:** `fs.watch` on the pages directory — catches manual file writes or other tools

**On reload trigger:**
- Push a WebSocket message to all connected browser clients
- Browser reloads the iframe with the latest visualization

**Auto-shutdown:**
- Track last activity (file write, browser connection, reload request)
- After 30 minutes of inactivity, shut down gracefully
- On next `chat-glass show`, a new server starts automatically

**Routes:**

| Route | Purpose |
|-------|---------|
| `GET /` | Main view — latest visualization in iframe + gallery strip |
| `GET /gallery` | Grid of all visualizations, most recent first |
| `GET /pages/:filename` | Serve individual HTML files |
| `GET /reload` | Trigger a browser reload (called by `chat-glass show`) |
| `WS /ws` | WebSocket endpoint for live reload |

#### Main View (`/`)

- Full-width display of the latest visualization in an iframe
- Thin gallery strip along the bottom showing timestamped titles of all previous visualizations
- Click any gallery item to view it
- Left/right arrow keyboard navigation
- Current position indicator in the gallery
- Opinionated dark theme consistent with the visualization style

#### Gallery View (`/gallery`)

- Grid of all visualizations, most recent first
- Each card shows: timestamp, title extracted from `<title>` tag
- Click to open in main view

### 3. File Structure

```
project-root/
├── .chat-glass/
│   ├── config.json          # port, PID, last activity timestamp
│   └── pages/
│       ├── 2026-02-18T14-30-00.html
│       ├── 2026-02-18T14-35-22.html
│       └── latest.html → (symlink to most recent)
├── .claude/
│   └── agents/
│       └── chat-glass.md    # (if installed project-level)
└── ...
```

User-level agent file (if installed with `install-agent`):
```
~/.claude/
└── agents/
    └── chat-glass.md
```

### 4. Installation & Setup

The complete setup for a new user:

```bash
npm i -g chat-glass
chat-glass install-agent
```

That's it. Two commands. Next time they talk to Claude Code, the subagent is available, and the first time Claude decides to visualize something, the server and browser appear automatically.

**For project-level agent install:**
```bash
chat-glass install-agent --local
```

### 5. Multi-Instance Safety

- Each project directory gets its own `.chat-glass/` with its own server on its own port
- Two Claude instances in the same project share one server (fine — they contribute to the same gallery)
- Two Claude instances in different projects get independent servers on different ports
- Port range 3737–3747 supports up to 11 concurrent projects
- If all ports are taken, the command reports an error with guidance

## Design Principles

1. **Magic over manual.** The user never manages infrastructure. Things start when needed and stop when idle.
2. **The main conversation stays clean.** No HTML, no SVG, no large outputs. Just "I've visualized X."
3. **Visualizations are disposable but persistent.** Timestamped files, easy to browse, easy to delete, easy to commit to git.
4. **The browser is a passive display.** You don't interact with it except to browse history.
5. **Opinionated design.** Dark theme, clean typography, good use of color and whitespace. Consistency over customization.
6. **Project-local by default.** Files live with the project. Users can choose to gitignore or commit them.
7. **No auth, no config, no complexity.** Localhost only. Single user. Files on disk.

## What's Out of Scope (v1)

- No bidirectional communication (browser doesn't send info back to Claude)
- No editing visualizations from the browser
- No MCP server component — the subagent uses native Claude Code tools (Write, Bash) only
- No image generation — HTML/SVG/CSS only
- No multi-user or remote access
- No custom themes or user-configured style overrides

## Tech Stack

- **Runtime:** Node.js (no external runtime dependencies)
- **Package manager:** npm
- **Server:** Node built-in `http` module + `ws` library for WebSockets
- **File watching:** Node built-in `fs.watch` (debounced)
- **Browser opening:** `open` npm package (cross-platform)
- **Testing:** Vitest (fast, zero-config, npm-compatible). Single `npm test` runs everything.
- **License:** MIT
- **Target:** Open source on GitHub, `npm i -g chat-glass` for anyone to use
