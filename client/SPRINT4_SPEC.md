# Sprint 4 Frontend Upgrade Spec

## 1. Right Sidebar - School Directory

Add a third column on the right side of the app-body that lists all 49 schools in the KB, organized by category. Make it collapsible.

### Categories:
- **Ivy League** (8): Harvard, Yale, Princeton, Columbia, Penn, Brown, Dartmouth, Cornell
- **Elite National** (15): Stanford, MIT, Caltech, Duke, UChicago, Johns Hopkins, Northwestern, Vanderbilt, Rice, Notre Dame, Georgetown, Emory, CMU, USC, WashU
- **Top LACs** (19): Williams, Amherst, Swarthmore, Pomona, Wellesley, Bowdoin, Carleton, Middlebury, Haverford, CMC, Smith, Grinnell, Colby, Bates, Macalester, Oberlin, Hamilton, Colgate, Vassar
- **STEM Powerhouses** (7): Georgia Tech, UIUC, Purdue, Michigan, UC Berkeley, Virginia Tech, Cal Poly SLO
- **Specialized Tech** (7): Harvey Mudd, Rose-Hulman, RPI, WPI, UCLA, Soka, Washington & Lee

### Design:
- Width: ~260px, collapsible (toggle in header or edge)
- Use <details><summary> for each category group (native HTML toggle)
- Each school name is a small clickable pill/tag that fills the chat input with the school name
- Category header shows count (e.g., "Ivy League · 8")
- Compact, subtle - not distracting from the main chat
- Use the taste-skill dark theme colors

### CSS:
```css
.school-dir { width: 260px; background: var(--bg-panel); border-left: 1px solid var(--border); overflow-y: auto; flex-shrink: 0; }
.school-dir details { border-bottom: 1px solid var(--border); }
.school-dir summary { padding: 10px 14px; font-size: 12px; font-weight: 600; color: var(--text-muted); cursor: pointer; user-select: none; }
.school-dir summary:hover { color: var(--text); }
.school-tag { display: inline-block; padding: 3px 8px; margin: 2px; border-radius: 6px; font-size: 11px; background: var(--surface-2); color: var(--text); cursor: pointer; border: 1px solid var(--border); transition: all 150ms; }
.school-tag:hover { background: var(--accent-soft); border-color: var(--accent); }
```

## 2. Expanded Student Profile

Add more fields to the profile sidebar. New fields to add:

### New Fields:
- **AP/IB Classes** (text): e.g. "AP Calc BC (5), AP Physics C (4), AP CS A (5)"
- **SAT Score** (number): moved from SAT/ACT combined
- **ACT Score** (number): separate
- **GPA** (keep, but add scale selector: Weighted/Unweighted)
- **Class Rank** (text): e.g. "Top 5%" or "15/400"
- **Extracurricular Activities** (textarea): expanded from single line - "List your top 3-5 activities with leadership roles and impact"
- **Awards & Honors** (textarea): "Competitions, awards, distinctions"
- **Intended Major(s)** (text): separate from interests
- **Hooks** (checkboxes): Legacy, First-Gen, Recruited Athlete, Underrepresented Minority, Rural
- **School Type** (select): Public / Private / Charter / Homeschool

### Implementation:
- Update `StudentProfile` type in both server/src/types.ts and client/src/types.ts
- Update `buildPrompt()` in agent.ts to include all new fields
- Update ProfileCard.tsx form with new fields
- Keep the form collapsible (existing pattern)
- Use taste-skill CSS variables

## 3. Export to Markdown

Add an "Export" button near the chat input area. When clicked:
- Collect the last assistant message content (the markdown)
- Add a header with date/timestamp
- Trigger browser download as .md file
- Button should be subtle: small icon + "Export" text

## 4. Model Switcher

Add a small model selector at the bottom of the page (footer area).

### API:
First, add a server endpoint `GET /api/models` that returns available models. The server should call the OpenCode Go API to list models.

### UI:
- Small horizontal selector at the very bottom of the page
- Shows current model name
- Dropdown or horizontal pill selector
- Sends selected model to server via WebSocket message type `set_model`
- Server stores per-session model preference

### Server changes (agent.ts):
- Add `GET /api/models` endpoint that queries the LLM provider for available models
- Handle `set_model` WebSocket message type
- Use the session-specific model for subsequent queries

## Files to Modify

### Server:
- `server/src/agent.ts` — add /api/models endpoint, handle set_model WS message
- `server/src/index.ts` — serve /api/models, handle set_model in WS
- `server/src/types.ts` — expand StudentProfile

### Client:
- `client/src/types.ts` — expand StudentProfile, add SchoolDirectory type
- `client/src/components/Header.tsx` — minor
- `client/src/components/ProfileCard.tsx` — expanded form fields
- `client/src/components/ChatPanel.tsx` — export button, model switcher
- `client/src/App.tsx` — add SchoolDirectory column, model state
- `client/src/styles/index.css` — new styles for all additions

### New files:
- `client/src/components/SchoolDirectory.tsx` — right sidebar
- `client/src/components/ModelSwitcher.tsx` — bottom model selector

## Do NOT
- Remove any existing functionality
- Change the WebSocket protocol format (add new message types, don't break existing)
- Add npm dependencies
- Use emoji
- Break the taste-skill dark theme
