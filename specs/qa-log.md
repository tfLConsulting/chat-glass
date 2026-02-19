# Chat-Glass — Pre-Build Q&A Log

Captured during initial planning session, 2026-02-18.

---

**Q1: Is this repo starting from scratch, and what's the goal?**
A1: Starting from scratch. The repo will be open-source on GitHub so people can grab it and use it in their Claude Code sessions.

**Q2: Preferred package manager / runtime?**
A2: No preference, wants maximum simplicity for end users. Decision: npm/npx (most universal, ships with Node). Plain Node for the server runtime.

**Q3: Agent file install location — user-level or project-level?**
A3: Offer both during `init`. Also raised that visualizations themselves might want to live in the project directory (not just `~/.chat-glass/`) so they can be checked into version control alongside the code they relate to. This shifts the original spec's assumption of a single global `~/.chat-glass/pages/` directory.

**Q4: Should pages directory be project-local or global by default?**
A4: Project-local (`.chat-glass/` in cwd) is the default. Global (`~/.chat-glass/`) available as an option. `.chat-glass/` added to `.gitignore` by default — users opt in to tracking visualizations. This is a meaningful departure from the original spec which assumed `~/.chat-glass/` everywhere.

**Q5: Notification mechanism — fs.watch, websocat, or HTTP ping?**
A5: Primary mechanism: `notify.sh` does `curl http://localhost:3737/reload` — simple, reliable, no external tools beyond curl (universally available). Secondary: server also watches the pages directory with `fs.watch` (debounced) as a fallback for manual file writes. Best of both, no extra dependencies.

**Q6: Guiding principle?**
A6: "Should work effortlessly. Doesn't have to be simple internally, although that usually helps." Prioritize user experience reliability over internal minimalism.

**Q7: Subagent model — hardcode Sonnet or make it flexible?**
A7: Don't hardcode the model. Let the calling Claude instance decide. The agent file can suggest defaulting to the latest Sonnet but shouldn't lock it in. This keeps it future-proof as models evolve.

**Q8: How polished does the gallery/browser UI need to be for v1?**
A8: Doesn't need to be amazing. Should be opinionated for consistency — pick a look, stick with it. Functional and cohesive over fancy.

**Q9: License and open-source scaffolding?**
A9: MIT license. Standard GitHub scaffolding (README, LICENSE, CONTRIBUTING, .github templates) — set it up from the start.

**Q10: Which CDN libraries should the subagent be allowed to use?**
A10: Broad range encouraged — CDN means no maintenance burden and less boilerplate. Approved list: Tailwind CSS, Mermaid, D3.js, Chart.js, Prism.js/Highlight.js (syntax highlighting), KaTeX (math), Three.js (3D). General instruction: use CDN libraries freely, prefer them over hand-rolling equivalent functionality. Not a closed list — subagent can use judgement.

**Q11: Testing strategy?**
A11: Yes, tests from the start. Must be dead simple to run — single `npm test` command, reliable every time. Integration tests for server (startup, file serving, WebSocket reload), smoke test for `init` CLI, unit tests for utilities as needed.

**Q12: Is `.claude/agents/` a real Claude Code feature, and is the agent approach viable?**
A12: Yes — fully supported. Agents are Markdown files with YAML frontmatter in `.claude/agents/` (project-level) or `~/.claude/agents/` (user-level). Claude auto-delegates based on the agent's `description` field. The `init` command should offer to install to either location. The spec's approach is validated.

**Q13: How does the subagent know where to write files?**
A13: Concern raised that relying on `.chat-glass/` existing in cwd is fragile — repo checkouts, cleanups etc. could break it. Solution: `chat-glass init` creates `.chat-glass/config.json` with pages path and port. Subagent checks for this file. If missing, tells user to run `chat-glass init`. Additionally, `chat-glass serve` should be self-healing — create directory structure if missing. The server being up is the real requirement.

**Q14: Server lifecycle — manual start or fully automatic?**
A14: Fully automatic. Zero manual steps. The subagent writes a file and runs a single command (e.g. `chat-glass show`). That command handles everything: start server if not running, find free port, open browser if not open, trigger reload. User never runs `chat-glass serve` manually. Multi-instance safe: each project gets its own `.chat-glass/` with its own port. Two Claudes in the same project share a server (fine). Two Claudes in different projects get separate servers. This is a major departure from the original spec — no manual server management at all.

**Q15: Does `chat-glass init` still need to exist?**
A15: No — fully lazy. First `chat-glass show` creates directories, picks a port, starts the server, opens the browser, all in one shot. The only real setup step is getting the agent file into `.claude/agents/`, which could be a one-liner: `npx chat-glass install-agent`. Everything else is on-demand.

**Q16: Global install or npx?**
A16: Global install (`npm i -g chat-glass`). Faster execution, subagent calls `chat-glass show` directly. The install-agent step is a natural moment to tell people to install globally. npx as fallback in docs for people who prefer it.

**Q17: Server lifecycle — how does it shut down?**
A17: Auto-shutdown after idle period (no new files, no browser connections). No manual stop command. Server is invisible infrastructure — starts when needed, goes away when not.

**Q18: Should Claude proactively visualize, and how should the agent description trigger it?**
A18: Yes, fully proactive. Don't restrict to trigger phrases — trust Claude to figure out when a visual would help. The agent description should be broad and encouraging: "use this whenever a visual explanation would be clearer than text." Claude decides, user gets magic.

---

*Q&A complete. Ready to write the v1 spec.*
