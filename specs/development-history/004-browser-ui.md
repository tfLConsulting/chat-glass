# 004 — Browser UI

## Goal

Build the main view and gallery view that the server serves to the browser. Opinionated, dark theme, consistent with the visualization style guide. Functional over fancy.

## Dependencies on

- 002 (core server — serves these pages)
- 003 (show command — triggers reloads)

## Tasks

### 1. Main view (`/`)

Single HTML page served inline by the server (not a static file — generated with current state).

**Layout:**
- Full viewport height
- Top: thin title bar with "chat-glass" branding + current visualization title + timestamp
- Center: iframe showing the current visualization (fills remaining space)
- Bottom: gallery strip — horizontal scrollable row of items

**Gallery strip:**
- Each item: timestamp + title (extracted from page's `<title>` tag via the `/api/pages` endpoint)
- Current item highlighted
- Click to load that visualization in the iframe
- Most recent on the right

**Keyboard navigation:**
- Left/right arrows: previous/next visualization
- Home/End: first/last
- `G`: toggle gallery view

**WebSocket client:**
- Connect to `ws://localhost:{port}/ws`
- On `reload` message: fetch updated page list from `/api/pages`, load the latest visualization in the iframe, update the gallery strip
- Auto-reconnect on disconnect (the server might restart)

### 2. Gallery view (`/gallery`)

**Layout:**
- Grid of cards, most recent first
- Each card: timestamp, title, and a small iframe preview (or just a styled card — iframes might be heavy with many items)
- Click a card to navigate to main view showing that visualization

**Decision:** For v1, skip iframe thumbnails. Just show styled cards with timestamp + title. Simpler, faster, no performance concerns with many pages.

### 3. Styling

Consistent with the visualization style guide:

- Background: `#1a1a2e`
- Text: `#e0e0e0`
- Accent: `#00d4ff`
- Font: system font stack
- Gallery strip: slightly lighter background (`#16213e`), subtle border top
- Active gallery item: accent border/highlight
- Smooth transitions on navigation
- Responsive: works on any screen size but optimized for ~1200×800

### 4. Error states

- No visualizations yet: friendly empty state ("Waiting for Claude to create a visualization...")
- WebSocket disconnected: subtle indicator, auto-reconnect
- Failed to load a page in iframe: show error in iframe area

## Done when

- Opening `localhost:{port}` shows the main view with the latest visualization
- Gallery strip shows all pages with correct titles and timestamps
- Clicking gallery items switches the visualization
- Arrow keys navigate between visualizations
- WebSocket reload updates the view live when a new file appears
- Gallery view shows a grid of all visualizations
- Everything looks cohesive and polished in dark theme
