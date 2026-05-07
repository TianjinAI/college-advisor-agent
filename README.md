# College Advisor Agent

AI-powered US college admissions advisor — a full-stack web application that helps high school students find, compare, and apply to US universities.

Built with **React + TypeScript** frontend, **Express + WebSocket** backend, **curated knowledge base** (49 elite colleges + 57 expert insights), **KB-first RAG routing**, and **OpenAI-compatible LLM** (DeepSeek via OpenCode Zen) with Tavily web search fallback.

## Features

- **Curated Knowledge Base** — 49 elite US college profiles with campus culture, admissions priorities ("what they look for"), application tips, distinctive traits, academic strengths, and curriculum style
- **Expert Insights** — 57 verified admissions insights across 8 categories (essays, strategy, financial aid, extracurriculars, interviews, timeline, general)
- **KB-First Smart Routing** — Queries are answered from the knowledge base first; web search supplements only for time-sensitive data (deadlines, rankings changes)
- **Smart College Recommendations** — Personalized school picks based on GPA, SAT/ACT, interests, budget, and target states
- **Structured Search** — Support for `tier:ivy`, `stem:elite`, `region:northeast` filters in KB retrieval
- **Streaming Chat** — WebSocket-powered real-time streaming responses with markdown rendering
- **Student Profile Panel** — Fill in your stats once; every query is automatically enriched with your context
- **Taste-Skill Premium UI** — Dark theme with Zinc/Slate base + Emerald accent, smooth animations, proper interactive states, noise grain texture, and accessible focus rings

## Knowledge Base

### College Coverage (49 schools)
| Tier | Count | Examples |
|------|-------|----------|
| Ivy League | 8 | Harvard, Yale, Princeton, Columbia, Penn, Brown, Dartmouth, Cornell |
| Elite National | 15 | Stanford, MIT, Caltech, Duke, UChicago, Johns Hopkins, Northwestern, Vanderbilt, Rice, Notre Dame, Georgetown, Emory, CMU, USC, WashU |
| Top LACs | 19 | Williams, Amherst, Swarthmore, Pomona, Wellesley, Bowdoin, Carleton, Middlebury, Haverford, CMC, Smith, Grinnell, Colby, Bates, Macalester, Oberlin, Hamilton, Colgate, Soka |
| Top STEM | 7 | Georgia Tech, UIUC, Purdue, Michigan, UC Berkeley, Virginia Tech, Cal Poly SLO |

Plus: Harvey Mudd, Rose-Hulman, RPI, WPI, UCLA, Vassar, Washington & Lee

### Data Sources
- **College Scorecard API** (federal, public domain) — acceptance rates, SAT/ACT ranges, tuition, earnings, demographics
- **Curated enrichment** — campus culture, admissions priorities, application tips, curriculum style, distinctive traits
- **Expert insights** — 57 admissions strategy entries sourced from verified admissions expertise

All data is legal for use: College Scorecard is public domain, enrichment is original curation, insights are synthesized from public admissions knowledge.

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
     │
     └── Student Profile sidebar
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| LLM | OpenAI-compatible API (default: DeepSeek V4 Flash via OpenCode Zen) |
| Knowledge Base | In-memory retriever with keyword + structured filter search |
| Search | Tavily API (web fallback for time-sensitive queries) |
| Backend | Express + WebSocket (`ws`) + TypeScript |
| Frontend | React 18 + Vite + TypeScript |
| Styling | Custom CSS with taste-skill design system (dark theme, Zinc/Slate + Emerald) |
| Markdown | `react-markdown` + `remark-gfm` |
| Streaming | WebSocket (custom event-based protocol) |

## Prerequisites

- **Node.js** >= 18.0.0
- An **OpenAI-compatible API key** (OpenCode Zen, OpenAI, or any compatible endpoint)
- A **Tavily API key** ([sign up free](https://tavily.com))

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/TianjinAI/college-advisor-agent.git
cd college-advisor-agent

# 2. Install all dependencies (root + server + client via workspaces)
npm install
cd client && npm install && cd ..

# 3. Configure API keys
cd server
cp .env.example .env
# Edit .env — fill in your LLM_API_KEY and TAVILY_API_KEY

# 4. Start the app (runs both server and client)
cd ..
npm run dev
```

Open your browser at **http://localhost:5181**

### Manual Start (separate terminals)

```bash
# Terminal 1 — Backend (port 3001)
cd server && npm run dev

# Terminal 2 — Frontend (port 5181)
cd client && npm run dev
```

## Environment Variables (`server/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `LLM_API_KEY` | Yes | Your OpenAI-compatible API key |
| `LLM_BASE_URL` | No | API base URL (default: `https://opencode.ai/zen/go/v1`) |
| `LLM_MODEL` | No | Model name (default: `deepseek-v4-flash`) |
| `TAVILY_API_KEY` | Yes | Tavily search API key |
| `PORT` | No | Backend port (default: `3001`) |

You can swap the LLM provider by changing `LLM_BASE_URL`, `LLM_API_KEY`, and `LLM_MODEL` — compatible with OpenAI, Azure OpenAI, local Ollama, LM Studio, etc.

## Project Structure

```
college-advisor-agent/
├── package.json                 # npm workspaces root
├── README.md
├── BENCHMARK_REPORT.md          # Competitive landscape analysis
├── REVIEW_REPORT.md             # Codex quality audit of knowledge base
├── CHANGES.md                   # Fix audit trail
├── .gitignore
├── data/
│   ├── schema.json              # JSON Schema for CollegeProfile
│   ├── colleges/                # 49 college profiles (JSON)
│   │   ├── harvard-university.json
│   │   ├── stanford-university.json
│   │   └── ...
│   └── experts/
│       └── insights.json        # 57 expert admissions insights
├── scripts/
│   ├── fetch_scorecard.py       # College Scorecard API fetcher
│   ├── parse_profiles.py        # Profile generator from API data
│   ├── seed_enrichment.py       # Curated enrichment data for all 49 schools
│   └── fix_mismatches.py        # School name mismatch fixer
├── server/
│   ├── .env.example             # Copy to .env and fill in keys
│   ├── src/
│   │   ├── index.ts             # Express + WebSocket server
│   │   ├── agent.ts             # LLM streaming + KB-first routing + Tavily search
│   │   ├── types.ts             # Shared type definitions
│   │   └── knowledge/
│   │       ├── retriever.ts     # In-memory RAG search + context builder
│   │       ├── types.ts         # CollegeProfile, ExpertInsight types
│   │       ├── scorecard.ts     # College Scorecard CSV parser
│   │       └── ingest.ts        # CLI ingestion tool
│   ├── tsconfig.json
│   └── package.json
└── client/
    ├── src/
    │   ├── App.tsx              # Main layout (Header + Profile + Chat)
    │   ├── main.tsx             # React entry point
    │   ├── types.ts             # Frontend type definitions (with KB source tracking)
    │   ├── components/
    │   │   ├── Header.tsx        # Top nav with KB indicator
    │   │   ├── ProfileCard.tsx   # Student profile sidebar form
    │   │   ├── ChatPanel.tsx     # Chat panel with WS integration
    │   │   └── MessageBubble.tsx # Markdown-rendered message bubble
    │   ├── hooks/
    │   │   └── useWebSocket.ts   # Custom WebSocket hook
    │   └── styles/
    │       └── index.css         # Taste-skill design system (dark theme)
    ├── vite.config.ts
    ├── tsconfig.json
    └── package.json
```

## Design System (Taste-Skill)

Applied from the [taste-skill](https://github.com/Leonxlnx/taste-skill) anti-slop design framework:

- **Dark theme** — Zinc/Slate base with Emerald accent (#10b981)
- **`min-h-[100dvh]`** — Prevents mobile browser layout jumping
- **Tabular numbers** — `font-variant-numeric: tabular-nums` on all data displays
- **Interactive states** — Hover translations, active press feedback, focus-visible rings
- **Noise grain overlay** — SVG turbulence filter at 2-3% opacity for depth
- **Tinted shadows** — Background-matched shadow hues
- **Inner border highlights** — `1px solid rgba(255,255,255,0.04)` on cards
- **Smooth transitions** — `cubic-bezier(0.16, 1, 0.3, 1)` easing
- **Geist font** — Premium sans-serif typography
- **Composed empty states** — Beautifully designed welcome with guidance

## Usage Tips

1. Fill in your **Student Profile** on the left sidebar (GPA, SAT/ACT, interests, budget, etc.)
2. Ask anything in the chat — the advisor uses the knowledge base first, web search as supplement
3. Try example prompts:
   - "Recommend 10 universities that fit my profile"
   - "Compare UC Berkeley vs UCLA for Computer Science"
   - "What are the top 20 CS programs in the US?"
   - "What does Harvard look for in applicants?"
   - "How is Stanford's campus culture different from MIT's?"
   - "STEM-strong schools in California under $50K"

## WebSocket Protocol

| Direction | Type | Description |
|-----------|------|-------------|
| Client → Server | `send_message` | `{ content: string, profile?: StudentProfile }` |
| Client → Server | `abort` | Cancel current stream |
| Server → Client | `text_start` | `{ messageId: string }` — new response starts |
| Server → Client | `text_delta` | `{ text: string, done: boolean, messageId: string, source?: 'kb'\|'web'\|'hybrid' }` |
| Server → Client | `error` | `{ text: string }` |

## Roadmap

- [x] Knowledge base — 49 elite college profiles with curated enrichment
- [x] Expert admissions insights (57 entries)
- [x] KB-first RAG routing with web search fallback
- [x] Codex quality audit (7/10, fixes applied)
- [x] Taste-skill premium UI (dark theme, animations, accessibility)
- [x] Competitive benchmark analysis (SolarEdu, CollegeVine, Cialfo, etc.)
- [x] Docker deployment for easy hosting
- [ ] Conversation history persistence (database)
- [ ] Multi-user authentication
- [ ] College comparison tool with data visualization
- [ ] Application timeline / deadline tracker
- [ ] Admissions case studies database

## Deployment (Docker)

The easiest way to share this app with others (e.g. your son) is to deploy it on a server. Your API keys stay on the server — users only need a browser.

### Quick Deploy

```bash
# 1. Clone the repo on your server
git clone https://github.com/TianjinAI/college-advisor-agent.git
cd college-advisor-agent

# 2. Create the env file with your API keys
cd server
cp .env.example .env
# Edit .env — fill in LLM_API_KEY and TAVILY_API_KEY
cd ..

# 3. Build and run
docker compose up -d --build

# 4. Open in browser
# http://your-server-ip:5181
```

### How It Works

In production mode:
- The backend serves the pre-built React frontend as static files
- WebSocket and API routes are handled on the same port (3001 inside container, mapped to 5181 outside)
- API keys are injected via `server/.env` — **never exposed to the browser**
- Users connect via browser and get a full chat experience

### Share With Others

Simply give them the URL (`http://your-server:5181`). No installation, no API keys needed on their end.

### Without Docker (Manual Deploy)

```bash
# Install dependencies
npm install
cd client && npm install && cd ..

# Build client
cd client && npm run build && cd ..

# Build server
cd server && npm run build && cd ..

# Set environment
export NODE_ENV=production
cd server && node dist/index.js
```

## License

MIT
