# College Advisor Agent

> **Not a dictionary. A counselor who gets to know you.**

An AI-powered college admissions advisor that builds a lasting relationship with each student — accumulating context across sessions, remembering who you are, and providing consistent, targeted, first-class guidance that improves over time.

Two students with identical 1520 SAT scores can have completely different profiles. One might be a first-gen student from a rural school with 4 APs total; the other might come from a prep school with 15 APs and legacy at three Ivies. This advisor captures that context — not just stats.

Built with **React + TypeScript** frontend, **Express + WebSocket** backend, a **curated knowledge base** (49 elite colleges + 57 expert insights), **KB-first RAG routing**, and an **OpenAI-compatible LLM** (DeepSeek via OpenCode Zen) with Tavily web search fallback.

## Philosophy

Traditional college advising tools are passive dictionaries — you ask a question, they spit out a stat. This advisor is different:

| Passive Dictionary | This Advisor |
|---|---|
| Forgets you every session | **Persistent student wiki** — dossier accumulates across sessions |
| One-size-fits-all answers | **Personalized** — every answer is contextualized to YOUR profile |
| Stats without narrative | **Origin & background** captured — rural, first-gen, hooks, challenges |
| No memory of past advice | **Conversation log** — the advisor remembers what was discussed |
| Single chat, no organization | **Multi-project sessions** — separate "Essay Review", "MIT Strategy", etc. |
| No confidence tracking | **Wiki page confidence** [high] [medium] [low] — knows what's verified vs. inferred |

The dossier evolves with every conversation. The LLM reads the existing wiki page, extracts new insights from the exchange, and rewrites the page. Over time, the advisor develops a nuanced understanding of who the student is.

## Features

### Core Advising
- **KB-First Smart Routing** — Answers from curated knowledge base first; web search supplements only for time-sensitive data (deadlines, rankings)
- **Streaming Chat** — WebSocket-powered real-time responses with markdown rendering
- **Smart Recommendations** — Personalized school picks based on GPA, SAT/ACT, interests, budget, and target states
- **Structured Search** — Support for `tier:ivy`, `stem:elite`, `region:northeast` filters in KB retrieval

### Persistent Student Profile (Dossier Wiki)
- **Auto-extracting wiki page** — After every conversation, the LLM reads the existing dossier, extracts new facts (academic stats, origin story, target schools, evolving concerns, advisor insights), and rewrites the full page
- **Narrative context** — Captures what makes this student DISTINCT: background, challenges overcome, motivations, fears
- **Confidence tracking** — Every insight marked [high] [medium] [low]
- **Frontmatter metadata** — domain, status, source_count, last_updated — tracks dossier evolution
- **System prompt injection** — The full dossier is injected into every query so the advisor always knows who it's talking to

### Multi-Project Sessions
- **Project isolation** — Separate chats for "General Advising", "Essay Review", "MIT Strategy", "School Comparison"
- **Shared dossier** — Student profile is shared across ALL projects
- **Session persistence** — Chat history saved per-project to `data/users/{userId}/sessions/{sessionId}/chat.json`
- **Session switcher UI** — Dropdown in header to create and switch projects

### User Identity
- **Display name** — Set your name ("Shaobin") instead of seeing a raw UUID
- **User ID switching** — Type any user ID to access your profile from another device
- **Persistent across browsers** — Same user ID = same dossier, anywhere

### Knowledge Base
- **49 elite US colleges** — 8 Ivy League, 15 Elite National, 19 Top LACs, 7 STEM Powerhouses + Specialized Tech
- **57 expert admissions insights** — Essays, strategy, financial aid, extracurriculars, interviews, timeline, general
- **College Scorecard data** — Acceptance rates, SAT/ACT ranges, tuition, earnings, demographics (federal, public domain)
- **Curated enrichment** — Campus culture, admissions priorities ("what they look for"), application tips, distinctive traits, curriculum style

### Design (Taste-Skill Anti-Slop)
- Dark/light theme with Emerald accent
- Noise grain overlay, tinted shadows, inner border highlights
- Proper interactive states (hover, active, focus-visible)
- Geist font, tabular numbers, `100dvh` viewport
- Responsive 3-column layout: Profile | Chat | School Directory

## Architecture

```
Browser (React)  ──── WebSocket ────►  Express Server
     │                                     │
     │                              ┌──────┴──────┐
     │                              │  KB-First   │
     │                              │   Router    │
     │                              └──────┬──────┘
     │                         ┌───────────┴───────────┐
     │                         ▼                       ▼
     │                  Knowledge Retriever       Web Search
     │                  (49 profiles + 57         (Tavily API)
     │                   insights in-memory)           │
     │                         │                       │
     │                         └───────────┬───────────┘
     │                                     ▼
     │                              LLM API (OpenCode Zen)
     │                                     │
     │                         ┌───────────┴───────────┐
     │                         ▼                       ▼
     │                   Dossier Wiki           Conversation Log
     │              (data/users/{id}/          (data/users/{id}/
     │                dossier.md)              conversations.md)
     │                         │
     │                         └─────── System Prompt Injection
     │
     └── Student Profile sidebar
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| LLM | OpenAI-compatible API (default: DeepSeek V4 Pro via OpenCode Zen) |
| Dossier Extraction | DeepSeek V4 Pro (reasoning_effort: low, max_tokens: 2000) |
| Knowledge Base | In-memory retriever with keyword + structured filter search |
| Search | Tavily API (web fallback for time-sensitive queries) |
| Backend | Express + WebSocket (`ws`) + TypeScript |
| Frontend | React 18 + Vite + TypeScript |
| Storage | File-based JSON + Markdown (`data/users/{userId}/`) |
| Styling | Custom CSS with taste-skill design system (dark/light theme, Emerald accent) |
| Markdown | `react-markdown` + `remark-gfm` |

## Quick Start

```bash
# 1. Clone
git clone https://github.com/TianjinAI/college-advisor-agent.git
cd college-advisor-agent

# 2. Install
npm install
cd client && npm install && cd ..

# 3. Configure API keys
cd server
cp .env.example .env
# Edit .env — fill in LLM_API_KEY and TAVILY_API_KEY

# 4. Run
cd ..
npm run dev
```

Open **http://localhost:5181** (dev) or **http://localhost:3001** (production).

## Project Structure

```
college-advisor-agent/
├── data/
│   ├── schema.json              # JSON Schema for CollegeProfile
│   ├── colleges/                # 49 college profiles (JSON)
│   ├── experts/insights.json    # 57 expert admissions insights
│   └── users/                   # Per-user persistent storage
│       └── {userId}/
│           ├── profile.json     # Display name
│           ├── dossier.md       # Living wiki page (frontmatter + sections)
│           ├── conversations.md # Cumulative Q&A log
│           └── sessions/
│               └── {sessionId}/
│                   ├── metadata.json  # { name, purpose, created_at }
│                   └── chat.json      # Session messages
├── server/src/
│   ├── index.ts                 # Express + WebSocket server
│   ├── agent.ts                 # LLM streaming + KB routing + dossier extraction
│   ├── types.ts                 # Shared types (SessionMetadata, StudentProfile, etc.)
│   ├── routes/sessions.ts       # Session CRUD + user profile API
│   └── knowledge/
│       ├── retriever.ts         # In-memory RAG search
│       ├── dossier.ts           # DossierManager (wiki, conversations, sessions)
│       ├── types.ts             # CollegeProfile, ExpertInsight types
│       ├── scorecard.ts         # College Scorecard parser
│       └── ingest.ts            # CLI ingestion tool
├── client/src/
│   ├── App.tsx                  # Root layout + session state management
│   ├── components/
│   │   ├── Header.tsx           # User ID, display name, session switcher, theme
│   │   ├── SessionSwitcher.tsx  # Project dropdown with create/switch
│   │   ├── ProfileCard.tsx      # Student profile form
│   │   ├── ChatPanel.tsx        # Chat with WS + session support
│   │   ├── MessageBubble.tsx    # Markdown-rendered messages
│   │   ├── ModelSwitcher.tsx    # LLM model selector
│   │   └── SchoolDirectory.tsx  # Collapsible school browser
│   └── styles/index.css         # Taste-skill design system
└── scripts/                     # Data pipeline scripts
```

## WebSocket Protocol

| Direction | Type | Description |
|-----------|------|-------------|
| Client → Server | `send_message` | `{ content, profile?, history?, userId, sessionId }` |
| Client → Server | `abort` | Cancel current stream |
| Client → Server | `set_model` | `{ model: string }` |
| Server → Client | `text_start` | `{ messageId: string }` |
| Server → Client | `text_delta` | `{ text, done, messageId, source?: 'kb'\|'web'\|'hybrid' }` |
| Server → Client | `error` | `{ text: string }` |

## REST API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/sessions?userId=X` | List sessions for user |
| POST | `/api/sessions` | Create session `{ userId, name, purpose? }` |
| GET | `/api/sessions/:id/messages?userId=X` | Load session messages |
| POST | `/api/sessions/:id/messages` | Save session messages |
| GET | `/api/user/profile?userId=X` | Get display name |
| PUT | `/api/user/profile` | Set display name `{ userId, displayName }` |
| GET | `/api/models` | List available LLM models |
| GET | `/health` | Health check |

## Roadmap

### ✅ Phase 1 — Foundation (Complete)
- [x] Knowledge base — 49 elite college profiles + 57 expert insights
- [x] KB-first RAG routing with web search fallback
- [x] Student profile form with personalized context injection
- [x] Taste-skill premium UI (dark/light theme, animations, accessibility)
- [x] Persistent student dossier wiki with LLM-powered extraction
- [x] Multi-project sessions with isolation + shared dossier
- [x] User identity system (display names, cross-device user ID)
- [x] Model switching (14 models)

### 🔜 Phase 2 — Narrative Depth (Planned)
- [ ] **Essay Writing & Review** — dedicated workspace for drafting, reviewing, and iterating on application essays. KB of successful essay patterns, common mistakes, prompt-specific guidance
- [ ] **Summer Programs** — curated database of STEM/Math/AI/Coding summer camps and programs. Deadlines, selectivity, cost, application requirements. Impact analysis on college applications
- [ ] **Competitions** — state and national-level STEM competitions database. AMC/AIME/USAMO, USACO, ISEF, Regeneron, Olympiads. How competition performance maps to admissions outcomes
- [ ] **Application Strategy Engine** — ED/EA/RD optimization, school list balancing, demonstrated interest tracking

### 🔮 Phase 3 — Scale & Polish
- [ ] Multi-user authentication
- [ ] College comparison tool with data visualization
- [ ] Application timeline / deadline tracker
- [ ] Admissions case studies database
- [ ] Parent dashboard view

## Development Methodology

This project follows the **Meta-Kim Governed Development** framework — an 8-stage pipeline:

```
Critical → Fetch → Thinking → Implement → Review → Meta-Review → Verify → Evolve
```

Every non-trivial feature flows through all 8 stages with gated checkpoints. External agents (Codex, Claude Code, OpenCode) handle implementation while Hermes orchestrates the pipeline and performs meta-review.

## Deployment

### Docker
```bash
docker compose up -d --build
# http://your-server:5181
```

### Manual (Production)
```bash
cd client && npm run build && cd ..
cd server && npm run build && cd ..
NODE_ENV=production node server/dist/index.js
# http://localhost:3001
```

## License

MIT
