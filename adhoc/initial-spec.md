# chat-glass — Visual Thinking Companion for Claude Code

## What It Is

A lightweight system that lets Claude Code push visual explanations to a persistent browser window during conversation. The main Claude instance describes *what* to visualize in plain English; a subagent generates the HTML in an isolated context; a tiny local server displays it with hot reload and keeps a gallery of all previous visualizations.

## Architecture

```
┌─────────────────────┐
│  Main Claude Code    │  "show a comparison of the 3 auth approaches"
│  (your conversation) │──────────────────────┐
└─────────────────────┘                       │
                                              ▼
                              ┌──────────────────────────┐
                              │  Visualizer Subagent      │
                              │  (fresh context, Sonnet)  │
                              │                          │
                              │  Receives: natural lang   │
                              │  Produces: standalone HTML │
                              │  Writes to: ~/.chat-glass/│
                              │    pages/{timestamp}.html  │
                              │  Runs: notify.sh          │
                              │  Returns: one-line summary │
                              └──────────┬───────────────┘
                                         │ file write + WebSocket ping
                                         ▼
                              ┌──────────────────────────┐
                              │  chat-glass server        │
                              │  (Node, always running)   │
                              │                          │
                              │  localhost:3737           │
                              │  Serves latest HTML       │
                              │  WebSocket hot reload     │
                              │  Gallery sidebar          │
                              └──────────────────────────┘
                                         │
                                         ▼
                              ┌──────────────────────────┐
                              │  Your browser tab         │
                              │  (always open)            │
                              └──────────────────────────┘
```

## Components

### 1. The Subagent — `.claude/agents/chat-glass.md`

**Config:**
- name: `chat-glass`
- model: `sonnet`
- tools: `Write`, `Bash`
- description: Should make clear this is for generating visual HTML/SVG explanations. Trigger phrases: architecture, comparison, flow, diagram, layout, tradeoffs, options, "show me", "visualize". The main agent should be encouraged to use this proactively whenever a visual would help, not just when explicitly asked.

**System prompt should instruct the subagent to:**
- Receive a plain-English description of what to visualize
- Generate a single, self-contained HTML file (inline CSS, inline JS, no external dependencies beyond CDN-hosted libraries)
- Allowed CDN libs: Mermaid, D3, Chart.js — but most visualizations should be pure HTML/CSS/SVG
- Design for a ~1200×800 viewport, dark theme by default (easy on the eyes next to a terminal), good typography
- Write the file to `~/.chat-glass/pages/{ISO-timestamp}.html`
- Also overwrite `~/.chat-glass/pages/latest.html` as a symlink or copy
- Run `~/.chat-glass/notify.sh` to trigger the browser reload
- Return a single sentence to the main agent describing what was visualized — nothing more

**Key constraint:** The subagent must never return HTML to the main agent. It writes to disk only. The return message is plain text, one line.

**Style guide for the subagent's system prompt:**

The subagent should produce visualizations that feel like a thoughtful colleague sketched something on a whiteboard — clear, purposeful, not over-designed. Specific guidance:

- **Dark theme default.** Background: `#1a1a2e` or similar deep blue-black. Text: `#e0e0e0`. Accent: a single bright color per visualization (rotate through a palette: `#00d4ff`, `#ff6b6b`, `#4ecdc4`, `#ffe66d`, `#a29bfe`).
- **Typography.** Use system font stack for body (`-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`). For headings or labels that need character, pull a single Google Font via CDN — vary it per visualization, don't always pick the same one.
- **Layout.** Generous whitespace. Content centered with max-width ~1000px. Use CSS grid/flexbox. No scrolling if possible — the visualization should fit the viewport.
- **Diagrams.** Prefer hand-drawn/organic SVG feel over rigid box diagrams when appropriate. Use rounded corners, subtle shadows, connecting lines with slight curves rather than right angles.
- **Comparison layouts.** Side-by-side cards, each with a clear header, key points, and a visual indicator of pros/cons (color-coded borders, thumbs up/down icons via SVG, etc).
- **Flow diagrams.** Horizontal or vertical depending on complexity. Nodes as rounded rectangles with labels, edges as curved SVG paths with arrowheads. Animate the flow direction subtly on load if it aids understanding.
- **No chartjunk.** Every visual element must earn its place. No decorative gradients, no 3D effects, no stock-illustration vibes.

### 2. The Server — `chat-glass`

A Node.js package, installed globally (`npm i -g chat-glass`) or run via npx (`npx chat-glass`).

**Responsibilities:**
- Serve on `localhost:3737` (configurable, fall back through 3737–3747 if port taken)
- Watch `~/.chat-glass/pages/` for file changes (fs.watch or chokidar)
- Maintain a WebSocket connection to the browser
- On file change: send reload signal over WebSocket
- Serve two views:

**Main view (`/`):**
- Full-width display of the latest visualization in an iframe
- Thin gallery strip along the bottom or left side showing timestamped thumbnails/titles of all previous visualizations
- Click any gallery item to view it
- Back/forward keyboard navigation (left/right arrows)
- Current position indicator in the gallery

**Gallery view (`/gallery`):**
- Grid of all visualizations, most recent first
- Each card shows: timestamp, first few words of the filename or an extracted `<title>`, a thumbnail (could be a small iframe or a static preview)
- Click to open full view

**`notify.sh`:**
- A tiny shell script the subagent calls after writing
- Could be as simple as `echo "reload" | websocat ws://localhost:3737/ws` or just `touch ~/.chat-glass/.reload` if the server is using fs.watch
- Should be generated/installed by the server setup

### 3. File Structure

```
~/.chat-glass/
├── pages/
│   ├── 2026-02-18T14-30-00.html
│   ├── 2026-02-18T14-35-22.html
│   ├── 2026-02-18T14-42-11.html
│   └── latest.html → (symlink to most recent)
├── notify.sh
└── config.json (optional: port, theme prefs, etc.)
```

### 4. Setup / First Run

The ideal flow:
1. User runs `npx chat-glass init` — creates `~/.chat-glass/` directories, writes `notify.sh`, starts the server, and opens the browser
2. User copies or symlinks the `chat-glass.md` agent file into `.claude/agents/` or `~/.claude/agents/`
3. That's it. Next time they talk to Claude Code, the visualizer subagent is available.

A single `chat-glass init` command should handle both steps — including offering to install the agent file to `~/.claude/agents/` (user-level, so it works across all projects).

**CLI commands:**
- `chat-glass init` — full setup: create dirs, write notify.sh, install agent, start server, open browser
- `chat-glass serve` — just start the server (for subsequent sessions)
- `chat-glass open` — open the browser tab to the server
- `chat-glass clean` — delete all pages, start fresh
- `chat-glass list` — list all saved visualizations with timestamps

## Design Principles

- **The main conversation stays clean.** No HTML, no SVG, no large outputs. Just "I've put a visualization on screen showing X."
- **Visualizations are disposable but persistent.** They're timestamped files, easy to browse, easy to delete, easy to reference later.
- **The browser tab is a passive display.** You don't interact with it except to browse history. It's a second monitor for your terminal conversation.
- **The subagent is opinionated about design.** Dark theme, clean typography, good use of color and whitespace. The system prompt includes a style guide so the outputs look consistent.
- **No auth, no config, no complexity.** Localhost only. Single user. Files on disk. Start the server, open the tab, forget about it.

## What's Explicitly Out of Scope (for v1)

- No bidirectional communication (browser doesn't send info back to Claude)
- No editing visualizations from the browser
- No MCP server component — the subagent uses native Claude Code tools (Write, Bash) only
- No image generation — HTML/SVG/CSS only
- No multi-user or remote access

## Nice-to-Haves (v1.1)

- The server injects a small header bar into each visualization showing timestamp and a title extracted from the HTML `<title>` tag
- Keyboard shortcut overlay (press `?` to see controls)
- Export current visualization as PNG (html2canvas or similar)
- A `/raw/{timestamp}` endpoint that serves the HTML without the gallery chrome, for embedding or sharing
- A CLAUDE.md in the project that tells Claude Code about the visualizer when working on the chat-glass codebase itself