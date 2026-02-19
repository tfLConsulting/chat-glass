# 005 — Subagent Definition & Install Command

## Goal

Write the agent file that turns Claude Code into a visual thinker, and build the `install-agent` command to put it in the right place.

## Dependencies on

- 003 (show command — the agent calls `chat-glass show`)

## Tasks

### 1. Write `agent/chat-glass.md`

This is the source-of-truth agent file that ships with the package. It contains:

**YAML frontmatter:**
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

**System prompt body — must instruct the subagent to:**

1. Receive a plain-English description of what to visualize
2. Generate a single, self-contained HTML file:
   - Inline CSS, inline JS
   - CDN libraries encouraged (Tailwind, Mermaid, D3, Chart.js, Prism/Highlight.js, KaTeX, Three.js, or any other CDN lib that fits)
   - Designed for ~1200×800 viewport
   - Must have a descriptive `<title>` tag (used by the gallery)
3. Write the file to `.chat-glass/pages/{ISO-timestamp}.html`
   - Timestamp format: `YYYY-MM-DDTHH-mm-ss` (filesystem-safe)
   - Create the directory if it doesn't exist
4. Run `chat-glass show` via Bash
5. Return a single sentence describing what was visualized — nothing more
6. **Never return HTML, SVG, or code to the main agent**

**Full style guide** (embedded in the system prompt):
- Dark theme defaults, color palette, typography
- Layout principles (whitespace, centering, no scroll)
- Diagram style (organic SVG, rounded corners, curved lines)
- Comparison style (side-by-side cards, color-coded)
- Flow style (rounded rect nodes, curved edges, optional animation)
- No chartjunk rule

### 2. Implement `src/commands/install-agent.js`

```
chat-glass install-agent [--local]
```

**Default (user-level):**
- Copy `agent/chat-glass.md` to `~/.claude/agents/chat-glass.md`
- Create `~/.claude/agents/` if it doesn't exist
- Report success: "Agent installed to ~/.claude/agents/chat-glass.md — available in all projects"

**With `--local` flag:**
- Copy to `.claude/agents/chat-glass.md` in cwd
- Create `.claude/agents/` if it doesn't exist
- Report success: "Agent installed to .claude/agents/chat-glass.md — available in this project"

**If file already exists:**
- Compare contents. If identical, report "Agent already up to date."
- If different, report difference and ask: overwrite? (or just overwrite with a note about what changed — keep it simple, no interactive prompts)
- Actually: just overwrite and report "Agent updated." Keep it simple.

### 3. Package the agent file

- Ensure `agent/chat-glass.md` is included in the npm package (`files` field in package.json)
- The install command resolves the agent file relative to the package installation, not cwd

## Done when

- `agent/chat-glass.md` contains a complete, well-crafted agent definition
- `chat-glass install-agent` copies it to `~/.claude/agents/`
- `chat-glass install-agent --local` copies it to `.claude/agents/`
- The installed agent file, when used by Claude Code, correctly triggers the subagent which writes HTML and calls `chat-glass show`
