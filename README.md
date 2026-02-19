# chat-glass

Visual thinking companion for Claude Code.

chat-glass gives Claude Code the ability to create rich, interactive visualizations -- diagrams, charts, comparisons, flowcharts -- and display them in a live-reloading browser viewer.

## What it does

When Claude Code needs to explain something visually, it delegates to the chat-glass agent. The agent writes a self-contained HTML file, and chat-glass serves it in a browser viewer with a gallery of past visualizations. Everything updates in real time via WebSocket.

## Quick start

```bash
npm install -g chat-glass
chat-glass install-agent
```

That's it. The agent is now available in Claude Code. When a visual explanation would help, Claude will automatically use it.

To install the agent for only the current project:

```bash
chat-glass install-agent --local
```

## How it works

1. Claude Code decides a visual would help and delegates to the chat-glass subagent
2. The subagent writes a self-contained HTML file to `.chat-glass/pages/`
3. The subagent runs `chat-glass show`, which starts a local server (or reloads an existing one)
4. The browser viewer updates in real time via WebSocket
5. A gallery strip lets you browse all past visualizations

## Commands

| Command | Description |
|---------|-------------|
| `chat-glass show` | Open the visualization viewer (starts server if needed) |
| `chat-glass list` | List saved visualizations |
| `chat-glass clean` | Delete all saved pages |
| `chat-glass install-agent` | Install the chat-glass agent file globally |
| `chat-glass install-agent --local` | Install the agent for the current project only |
| `chat-glass --help` | Show help |

## Configuration

chat-glass stores data in a `.chat-glass/` directory in your project root:

```
.chat-glass/
  config.json    # Server state (port, pid, timestamps)
  pages/         # Generated HTML visualizations
    latest.html  # Symlink to most recent page
```

The server listens on `127.0.0.1` on a port in the range 3737-3747 and shuts down automatically after 30 minutes of inactivity.

## For contributors

```bash
git clone https://github.com/tfLConsulting/chat-glass.git
cd chat-glass
npm install
npm test
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

## License

[MIT](LICENSE)
