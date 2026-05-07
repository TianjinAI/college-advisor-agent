# UI Fix Spec — Layout Scroll + Theme Toggle

## Issue 1: Content cut off (overflow: hidden)
- `client/src/styles/index.css` line 51: `body { overflow: hidden }` → change to `overflow-x: hidden; overflow-y: auto`
- Line 320: `.main-content { overflow: hidden }` → change to `overflow-y: auto`
- Ensure `.sidebar` keeps its `overflow-y: auto`
- The `.app-container` uses `min-height: 100dvh` (already correct)

## Issue 2: Add light/dark theme toggle
### CSS additions (in index.css):
Add a `[data-theme="light"]` block that overrides CSS variables:
```css
[data-theme="light"] {
  --bg: #f5f6f8;
  --bg-elevated: #ffffff;
  --bg-panel: #fafbfc;
  --bg-panel-2: #f0f2f5;
  --bg-soft: #e8ecf1;
  --surface: #ffffff;
  --surface-2: #f8f9fb;
  --surface-3: #f0f2f5;
  --text: #1a1d24;
  --text-muted: #5f6b7a;
  --text-dim: #8b95a5;
  --border: rgba(15, 23, 42, 0.10);
  --border-strong: rgba(15, 23, 42, 0.16);
  --inner-highlight: rgba(0,0,0,0.03);
  --shadow-sm: 0 2px 8px rgba(0,0,0,0.06);
  --shadow-md: 0 4px 16px rgba(0,0,0,0.08);
  --shadow-lg: 0 8px 32px rgba(0,0,0,0.10);
}
[data-theme="light"] body {
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
}
[data-theme="light"] body::before {
  opacity: 0.015;
}
```
Also remove the dark gradient from body::before when in light mode (override background to a cleaner gradient).

### Theme toggle button CSS:
```css
.theme-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--surface-2);
  color: var(--text-muted);
  font-size: 12px;
  cursor: pointer;
  transition: all 180ms var(--ease-out-expo);
  flex-shrink: 0;
}
.theme-toggle:hover {
  background: var(--bg-soft);
  color: var(--text);
}
.theme-toggle:focus-visible {
  box-shadow: 0 0 0 2px var(--bg), 0 0 0 4px var(--accent);
}
```

### Header.tsx changes:
- Import useState, useEffect from react
- Add theme state: `const [theme, setTheme] = useState<'dark'|'light'>(() => localStorage.getItem('theme') as 'dark'|'light' || 'dark')`
- useEffect: set `document.documentElement.dataset.theme = theme` and save to localStorage
- Add a toggle button next to the KB indicator, showing sun/moon icon text (☀️ for light, 🌙 for dark — or use inline SVG icons)

### HTML changes (index.html):
- Add `data-theme="dark"` to the `<html>` tag as default

## Files to modify
- `client/src/styles/index.css` — overflow fixes + light theme + toggle CSS
- `client/src/components/Header.tsx` — theme toggle button + state
- `client/index.html` — data-theme default attribute

## Do NOT
- Change the layout structure
- Add any new npm dependencies
- Break existing dark theme
- Use emoji for the toggle icon (use SVG or Unicode characters instead)
