# 007 — Open Source Packaging

## Goal

Make the project ready to publish on GitHub and npm. Everything a user or contributor needs to get started.

## Dependencies on

- 006 (tests passing)

## Tasks

### 1. README.md

Structure:
- **Hero:** One-line description + a screenshot/gif placeholder (fill in once we have something visual)
- **What it does:** 2-3 sentence explanation
- **Quick start:** The two commands (`npm i -g chat-glass` + `chat-glass install-agent`)
- **How it works:** Brief architecture description (Claude decides → subagent writes HTML → browser shows it)
- **Commands:** Table of CLI commands
- **Configuration:** Explain project-local `.chat-glass/` directory, config.json
- **For contributors:** How to clone, install, test, develop locally
- **License:** MIT

### 2. CONTRIBUTING.md

- How to set up a dev environment
- How to run tests
- PR guidelines (keep it brief)
- Code style notes (ESM, no unnecessary dependencies)

### 3. LICENSE

- MIT, already created in 001

### 4. .github/ templates

- `ISSUE_TEMPLATE/bug_report.md` — basic bug report template
- `ISSUE_TEMPLATE/feature_request.md` — basic feature request template
- `pull_request_template.md` — checklist (description, tests, breaking changes)

### 5. package.json finalization

- Ensure `files` field includes only what's needed: `bin/`, `src/`, `agent/`
- `engines`: specify minimum Node version (18+)
- `repository`, `homepage`, `bugs` fields pointing to GitHub
- `keywords`: `claude`, `claude-code`, `visualization`, `ai`, `developer-tools`
- Verify `npm pack` produces a clean tarball

### 6. CLAUDE.md

- Project-level instructions for when Claude Code is used to develop chat-glass itself
- Point to specs/, explain development-history pattern
- Note the testing convention (`npm test`)
- Mention that this project uses ESM

## Done when

- `npm pack` produces a clean package
- README has clear quick-start instructions
- A new contributor can clone, `npm install`, `npm test`, and understand the project
- GitHub templates are in place
- Ready to `npm publish` and push to GitHub
