# Long-term memory (Flowchart Studio workspace)

## UI / UX testing

- Prefer **Chrome DevTools MCP** (`user-chrome-devtools`) for interactive UI/UX checks on this machine: `list_pages`, `navigate_page`, `take_snapshot`, `take_screenshot`, `click`, `select_page` with `bringToFront: true` when verifying what the user sees.
- **Viewport defaults:** resize with `resize_page` before click-throughs — **1280×800** (desktop), **390×844** (mobile).
- Use the embedded Simple Browser only when DevTools MCP is unavailable or for quick Cursor-internal previews.
- After auditing in the browser, apply fixes in `apps/web` and re-check critical flows (home → sign-in → editor).

## Product note

- The editor lives at `/app/editor` and requires auth; marketing CTAs should set `callbackUrl` so users land in the editor after sign-in.
