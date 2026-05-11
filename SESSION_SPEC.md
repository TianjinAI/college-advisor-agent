# Multi-Session System Spec

## Architecture
```
data/users/{userId}/
  dossier.md                    ← shared profile (all sessions)
  conversations.md              ← cumulative Q&A log (all sessions)
  sessions/
    {sessionId}/
      chat.json                 ← this session's messages
      metadata.json             ← { name, created_at, purpose }
  essays/
    {essayId}.json              ← EssaySubmission (independent of sessions)
    {essayId}-review.json       ← EssayReview (written after stream completes)
```

> **Essay submissions are independent of chat sessions.** Students can submit essays for review from any session — the essay review workspace is a separate workflow from the advisor chat. Essays are stored per user, not per session.

## User Flow
1. First visit: generate userId, create default "General Advising" session
2. User sees User ID + active session name in header
3. Can create new sessions (e.g. "Essay Review", "MIT Strategy")
4. Switching sessions loads that session's chat history
5. Dossier + conversations.md loaded for ALL sessions under same userId
6. Chat within each session is isolated

## UI Changes
### Header (client/src/components/Header.tsx)
- Add User ID box: small input showing truncated userId (e.g. "user-a3f9..."), clickable to copy
- Add Session/Project dropdown selector next to the theme toggle
- "+" button to create new session

### New Component: SessionSwitcher (client/src/components/SessionSwitcher.tsx)
- Dropdown showing current session name
- List existing sessions from server
- "+ New Project" button opens inline input for session name
- Props: sessions, currentSessionId, onSwitch, onCreate

### App.tsx changes:
- Load userId from localStorage
- On mount, fetch sessions list from server
- Track currentSessionId in state
- When switching sessions, load that session's messages from server
- When sending message, save to current session

## Server Changes
### NEW: server/src/routes/sessions.ts
- `GET /api/sessions?userId=xxx` → list sessions for user
- `POST /api/sessions` → create new session `{ userId, name, purpose? }`
- `GET /api/sessions/:id/messages?userId=xxx` → load messages
- `POST /api/sessions/:id/messages` → save messages (called after each exchange)

### Modify: server/src/index.ts
- Register session routes
- On WebSocket message, associate with sessionId
- Pass sessionId to agent context loading
- After response, save messages to session storage

### Modify: server/src/knowledge/dossier.ts
- Add session methods: listSessions, createSession, loadMessages, saveMessages
- Session metadata stored in `sessions/{sessionId}/metadata.json`
- Messages stored in `sessions/{sessionId}/chat.json`

## Client WebSocket Changes
### ChatPanel.tsx
- Send sessionId with each message
- On session switch, clear messages and load from server
- Show "Export session" option that exports full conversation

## Implementation Notes
- Keep it simple: sessions stored as JSON files, no database
- Session names: user-editable
- Default session: "General Advising" created on first visit
- Message history limit per session: last 200 messages
- Session list sorted by last activity

## Files to Create
- `client/src/components/SessionSwitcher.tsx`
- `server/src/routes/sessions.ts`

## Files to Modify
- `client/src/components/Header.tsx` — add userId display + session switcher
- `client/src/App.tsx` — session state, load/save messages
- `client/src/components/ChatPanel.tsx` — sessionId in payload, message loading
- `server/src/index.ts` — session routes, sessionId in WS
- `server/src/knowledge/dossier.ts` — session storage methods
- `server/src/agent.ts` — load session-specific conversation context
