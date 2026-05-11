# Essay Writing & Review Module — Specification

## Overview

A dedicated workspace for students to draft, submit, and receive streaming structured feedback on their US college application essays. Built as a tab within the existing EssayPanel alongside the reference library (prompts + patterns).

## Architecture

```
Browser (EssayWorkspace.tsx)
    │
    ├─ POST /api/essays/user/:userId  ──► EssayManager  ──► data/users/{userId}/essays/{id}.json
    │
    ├─ GET  /api/essays/user/:userId  ──► EssayManager  ──► data/users/{userId}/essays/
    │
    └─ WebSocket /ws
            └─ review_essay  ──► createEssayReviewStream()  ──► review_start / review_delta / review_error
                                       (agent.ts, no KB/web search)

Browser (EssayPanel.tsx — Review tab)
    ├─ EssayWorkspace
    │   ├─ Prompt selector (from /api/essays/prompts)
    │   ├─ Draft textarea (word count, limit warning)
    │   ├─ Submit button → save + WS review request
    │   ├─ Streaming review output (markdown-ish rendering)
    │   └─ History sidebar (past submissions)
    └─ EssayPromptCard / EssayPatternCard (existing Prompts/Patterns tabs)
```

## Data Model

### EssaySubmission (client type)

```typescript
interface EssaySubmission {
  id: string;           // "essay_{timestamp}_{randomHex}"
  userId: string;
  promptId: string;     // e.g. "common-app-1"
  promptLabel: string;  // e.g. "Background & Identity"
  draftText: string;
  wordCount: number;
  submittedAt: number;   // Unix ms timestamp
}

interface EssayEntry extends EssaySubmission {
  review?: EssayReview;
}

interface EssayReview {
  content: string;       // Full review text (markdown)
  model: string;         // Model used for review
  reviewedAt: number;    // Unix ms timestamp
}
```

### Storage

```
data/users/{userId}/essays/
    {essayId}.json           — EssaySubmission
    {essayId}-review.json    — EssayReview (written after stream completes)
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/essays/stats` | `{ promptCount, patternCount }` |
| GET | `/api/essays/prompts` | Array of all essay prompts |
| GET | `/api/essays/patterns` | Array of all essay patterns |
| GET | `/api/essays/user/:userId` | `{ essays: EssayEntry[], total }` |
| POST | `/api/essays/user/:userId` | Save new submission → `{ essay: EssaySubmission }` |

## WebSocket Protocol

### Client → Server

```typescript
{
  type: 'review_essay',
  payload: {
    essayId: string,
    essayText: string,       // Raw essay text
    promptId: string,
    promptLabel: string,
    promptText: string,      // Full prompt question
    wordLimit: string,       // e.g. "650"
    tips: string[],          // Prompt-specific tips
    pitfalls: string[],      // Prompt-specific pitfalls
    userId: string,
    model: string,           // Model to use for review
  }
}
```

### Server → Client

```typescript
// Stream begins
{ type: 'review_start', payload: { essayId: string } }

// Chunks
{ type: 'review_delta', payload: { text: string, done: boolean } }

// On error
{ type: 'review_error', payload: { text: string } }
```

## Review System Prompt

The essay review uses a **dedicated system prompt** (`ESSAY_REVIEW_SYSTEM_PROMPT` in `agent.ts`) that is separate from the general advisor. It instructs the model to:

1. **Analyze the Request** — role, task, structure requirements, rules
2. **Analyze the Input Essay** — content, prompt alignment, issues
3. **Structure the Feedback** — Overall Assessment → Strengths → Areas for Improvement → Prompt Alignment → Voice & Authenticity → Structural Feedback → Revision Priorities
4. **Refine the Language** — be direct, quote passages, no generic praise

Key constraints:
- NO rewriting of the essay
- Quote specific passages with *italics*
- No generic praise (e.g. "great job!")
- Push for authenticity and specificity
- Mark structural issues clearly
- No length limit on feedback

## Files

| File | Purpose |
|------|---------|
| `server/src/knowledge/essayManager.ts` | EssayManager class — save/load/list essays |
| `server/src/knowledge/essayManager.js` | Compiled output |
| `server/src/agent.ts` | `createEssayReviewStream()` function + `ESSAY_REVIEW_SYSTEM_PROMPT` |
| `server/src/routes/essays.ts` | Essay REST API routes |
| `server/src/index.ts` | `handleEssayReview()` WebSocket handler |
| `client/src/components/EssayWorkspace.tsx` | Draft input + streaming review UI |
| `client/src/components/EssayPanel.tsx` | Review tab + props passthrough |
| `client/src/types.ts` | `EssaySubmission`, `EssayEntry`, `EssayReview` types |

## Prompt Knowledge Base

34 prompts across 8 categories:
- Common App (7 prompts)
- Why This Major (5 prompts)
- Community & Background (4 prompts)
- Personal Growth (5 prompts)
- Creative/Experimental (5 prompts)
- Academic Passion (4 prompts)
- Diversity & Perspective (3 prompts)
- Specific Experience (3 prompts)

15 patterns across 6 types:
- Narrative Arc (2)
- Montage (2)
- Dialogue-Driven (2)
- Object-Metaphor (2)
- Counter-Intuitive (2)
- Academic Deep-Dive (2)

## Status

✅ **Complete** — Implemented 2026-05-11
