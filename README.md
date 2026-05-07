# College Advisor Agent

AI-powered US college admissions advisor — a full-stack web application that helps high school students find, compare, and apply to US universities.

Built with **React + TypeScript** frontend, **Express + WebSocket** backend, **OpenAI-compatible LLM** (DeepSeek via OpenCode Zen), and **Tavily** real-time web search.

## Features

- **Smart College Recommendations** — Personalized school picks based on GPA, SAT/ACT, interests, budget, and target states
- **Real-time Data** — Tavily web search fetches up-to-date rankings, tuition, acceptance rates, and deadlines
- **Streaming Chat** — WebSocket-powered real-time streaming responses with markdown rendering
- **Student Profile Panel** — Fill in your stats once; every query is automatically enriched with your context
- **Academic Design** — Clean Ivy League-inspired UI (Navy + Gold)

## Architecture

```
Browser (React)  ──── WebSocket ────►  Express Server  ────►  LLM API (OpenAI-compatible)
     │                                     │
     │                                     └─────►  Tavily Search API
     │
     └── Student Profile sidebar
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| LLM | OpenAI-compatible API (default: DeepSeek via OpenCode Zen) |
| Search | Tavily API (real-time web search) |
| Backend | Express + WebSocket (`ws`) + TypeScript |
| Frontend | React 18 + Vite + TypeScript |
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
├── .gitignore
├── server/
│   ├── .env.example             # Copy to .env and fill in keys
│   ├── src/
│   │   ├── index.ts             # Express + WebSocket server
│   │   ├── agent.ts             # LLM streaming + Tavily search logic
│   │   └── types.ts             # Shared type definitions
│   ├── tsconfig.json
│   └── package.json
└── client/
    ├── src/
    │   ├── App.tsx              # Main layout (Header + Profile + Chat)
    │   ├── main.tsx             # React entry point
    │   ├── types.ts             # Frontend type definitions
    │   ├── components/
    │   │   ├── Header.tsx        # Top navigation bar
    │   │   ├── ProfileCard.tsx   # Student profile sidebar form
    │   │   ├── ChatPanel.tsx     # Chat panel with WS integration
    │   │   └── MessageBubble.tsx # Markdown-rendered message bubble
    │   ├── hooks/
    │   │   └── useWebSocket.ts   # Custom WebSocket hook
    │   └── styles/
    │       └── index.css         # Global CSS (Ivy League theme)
    ├── vite.config.ts
    ├── tsconfig.json
    └── package.json
```

## Usage Tips

1. Fill in your **Student Profile** on the left sidebar (GPA, SAT/ACT, interests, budget, etc.)
2. Ask anything in the chat — the advisor searches the web for real-time data when needed
3. Try example prompts:
   - "Recommend 10 universities that fit my profile"
   - "Compare UC Berkeley vs UCLA for Computer Science"
   - "What are the top 20 CS programs in the US?"
   - "Which schools under $50K/year have strong engineering programs?"

## WebSocket Protocol

| Direction | Type | Description |
|-----------|------|-------------|
| Client → Server | `send_message` | `{ content: string, profile?: StudentProfile }` |
| Client → Server | `abort` | Cancel current stream |
| Server → Client | `text_start` | `{ messageId: string }` — new response starts |
| Server → Client | `text_delta` | `{ text: string, done: boolean, messageId: string }` |
| Server → Client | `error` | `{ text: string }` |

## Design

- **Color palette**: Navy (`#1a365d`) + Gold (`#c5a55a`) — inspired by Ivy League aesthetics
- **Typography**: System fonts for optimal readability
- **Responsive**: Adapts to mobile (sidebar collapses)
- **Markdown**: Full GFM support with tables, code blocks, and blockquotes

## Roadmap

- [ ] Conversation history persistence (database)
- [ ] Multi-user authentication
- [ ] College comparison tool with data visualization
- [ ] Application timeline / deadline tracker
- [ ] Essay review and feedback
- [ ] Docker deployment for easy hosting

## License

MIT
