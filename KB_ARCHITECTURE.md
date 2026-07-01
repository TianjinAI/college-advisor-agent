# College Advisor Knowledge Base — Architecture Reference

Generated: May 2026
Purpose: Durable documentation for future workers and mk-design architecture review.

---

## 1. Project Overview

- **Project**: College Advisor Agent (college-advisor-agent)
- **Description**: US college admissions consulting AI — web app with Express + WebSocket backend + React frontend
- **Location**: `/home/admin/college-advisor-agent/`
- **Language**: TypeScript → compiled to JavaScript (`server/dist/`, `client/dist/`)

---

## 2. Deployment

### Docker

- **Base Image**: `node:20-alpine`
- **Port Exposed**: `3001`
- **Build**: Multi-stage (`client-builder`, `server-builder`, `production`)
- **Startup**: `node dist/index.js` from `/app/server/`

### Runtime Environment Variables (`.env`)

```
LLM_BASE_URL=https://opencode.ai/zen/go/v1
LLM_API_KEY=<your-key>
LLM_MODEL=deepseek-v4-flash
TAVILY_API_KEY=tvly-<your-key>
PORT=3001
```

**Note**: Current config uses OpenCode Zen API (OpenAI-compatible) with `deepseek-v4-flash` as default model. Tavily provides real-time web search for time-sensitive queries.

---

## 3. LLM Routing

```
User query → KB search → Tavily (if needed) → OpenCode Zen API → DeepSeek-v4-flash → Streaming response via WebSocket
```

- **Primary Source**: Knowledge base (colleges + insights + essays)
- **Fallback**: Web search via Tavily (timeout 4s, cached 10 min)
- **Models Available**: `/api/models` endpoint queries LLM_BASE_URL for available models

---

## 4. Knowledge Base Structure

| Directory | Contents | Count |
|-----------|----------|-------|
| `data/colleges/` | College profiles (JSON) | 49 |
| `data/experts/insights.json` | Expert admissions insights | 57+ |
| `data/essays/prompts.json` | Common App + supplemental prompts | — |
| `data/essays/patterns.json` | Essay structural patterns | — |
| `data/financial-aid/` | Federal + school FA data | — |
| `data/advising-ingestion/entries/` | Tier B scraped advising content | 3+ |

### College Profile Schema

```json
{
  "id": "harvard-university",
  "name": "Harvard University",
  "shortName": "Harvard",
  "location": { "city": "Cambridge", "state": "MA", "region": "northeast" },
  "type": "national-university",
  "tier": "ivy",
  "control": "private",
  "academics": { "strengths": [...], "stemStrength": "elite", ... },
  "admissions": { "acceptanceRate": 0.034, "satRange": {...}, ... },
  "cost": { "tuitionAndFees": 54269, ... },
  ...
}
```

See `data/schema.json` for full schema definition.

---

## 5. Server Architecture

### Express Routes

| Route | Purpose |
|-------|---------|
| `GET /health` | Health check |
| `GET /api/models` | List available LLM models |
| `WS /` | Main WebSocket for agent queries |
| `/api/essays` | Essay prompts and review |
| `/api/summer-programs` | Summer program recommendations |
| `/api/advising-ingestion` | Tier B content ingestion |
| `/api/fa` | Financial aid queries |
| `/api/upload` | Document uploads |
| `/api/auth` | Authentication (JWT) |

### Core Modules

- **`server/dist/agent.js`**: Agent stream, essay review, summer recommend, dossier manager
- **`server/dist/knowledge/retriever.js`**: Knowledge base loader + search (colleges, insights, essays, patterns, advising)
- **`server/dist/knowledge/dossier.js`**: Per-user persistent context (sessions, conversation history)
- **`server/dist/faAgent.js`**: Financial aid agent with KB

### Key Flows

1. **Main Query**: `handleAgentQuery()` → KB search → maybe Tavily → LLM → streamed WS response → save to dossier
2. **Essay Review**: `handleEssayReview()` → dedicated essay prompt → LLM → save review
3. **Summer Recommend**: `handleSummerRecommend()` → search programs → LLM → recommendations
4. **Financial Aid**: `handleFAQuery()` → FA retriever → KB search → LLM

---

## 6. Data Flow

```
Client (React)
    ↓ WebSocket ?token=<jwt>
Server (Express + WS)
    ├── knowledge/retriever.js (loads KB on startup)
    │   └── searchColleges(), searchInsights(), searchEssays(), ...
    ├── knowledge/dossier.js (per-user, sessions/)
    ├── Tavily (web search, if needed)
    └── OpenCode Zen API → DeepSeek-v4-flash
         ↓
Client receives streaming deltas
```

---

## 7. Persistence

- **Users**: `data/users.json` (username, hashed password)
- **User Data**: `data/users/<userId>/` (dossiers, sessions, uploads)
- **Essays/Reviews**: `data/users/<userId>/essays/`
- **Uploaded Docs**: `data/uploads/`

---

## 8. Dependencies (Server)

```
express, cors, ws, openai, @tavily/core, jsonwebtoken, bcryptjs, multer, uuid
dev: typescript, tsx, @types/*
```

---

## 9. Quick Commands

```bash
# Development
cd college-advisor-agent
npm run dev -w server   # tsx watch
npm run dev -w client   # Vite

# Production build
npm run build          # builds client then server

# Docker
docker build -t college-advisor .
docker run -p 3001:3001 -v $(pwd)/server/.env:/app/server/.env college-advisor

# Health
curl http://localhost:3001/health
```

---

## 10. Known Quirks

- **KB Search First**: Agent ALWAYS searches KB first; Tavily only triggers for time-sensitive queries (deadlines, tuition, rankings)
- **Session History**: Stored per user per session, limited to last 12 messages per LLM call
- **Dossier Extraction**: Async after every response — extracts facts to user's persistent wiki
- **Essay Review**: Dedicated prompt (no KB/search) — gives structural feedback only
- **Summer Programs**: Lazy-loads program manager, returns fit scores

---

## 11. For Future Workers

- **Adding a College**: Add JSON to `data/colleges/`, run retriever (auto-reloads on restart)
- **Adding Insights**: Append to `data/experts/insights.json` or add new entry file
- **Essay Prompts**: Update `data/essays/prompts.json` with new prompts, tips, pitfalls
- **Financial Aid**: Add school JSON to `data/financial-aid/schools/`, run `faAgent.prewarm()`