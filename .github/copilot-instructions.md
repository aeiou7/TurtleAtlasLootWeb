# Copilot Instructions — TurtleAtlasLootWeb

## Project Overview
Web interface for the Turtle WoW AtlasLoot addon. Parses Lua addon data into JSON and renders it as a browsable loot database.

## Tech Stack
- **Frontend**: Vue 3 + Vite + TypeScript + Pinia + Vue Router + TailwindCSS v4
- **Parser**: Python (`tools/parse_lua.py`) — converts AtlasLoot Lua files to JSON
- **Deployment**: GitHub Pages at `https://mrdobby92.github.io/TurtleAtlasLootWeb/`

## Project Structure
- `src/` — Vue app source (pages, components, composables, stores, types)
- `public/data/` — Generated JSON data files (output of parser)
- `tools/parse_lua.py` — Lua→JSON parser
- `AtlasLoot-main/` — Addon source (separate workspace root, read-only reference)

## Dev Server
npm has `os=linux` config — use `node start-dev.mjs` instead of `npm run dev`.

## Parser Usage
```
python tools/parse_lua.py --addon-path ../AtlasLoot-main --output ./public/data
```

## Git Policy
**Do NOT commit, push, or perform any git operations unless explicitly asked.** Wait for the user to request git actions before staging, committing, or pushing.

## Code Style
- Keep solutions simple and minimal
- Use existing CSS variables from `src/style.css` (e.g., `--bg-card`, `--accent`, `--border`)
- Quality colors use `--q0` through `--q6` CSS variables
- Tooltip data comes from `public/data/tooltips/` (chunked JSON files)
