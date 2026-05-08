# User Dossier System — Persistent Cross-Session Memory

## Overview
Build a persistent user profile that accumulates across sessions. Unlike the 12-message short-term history, the dossier stores facts about WHO the student is — GPA, scores, preferences, target schools, application strategy. It lives as a markdown file and is injected into the system prompt at session start.

## Files to Create/Modify

### 1. NEW: server/src/knowledge/dossier.ts
A DossierManager class:
```
class DossierManager {
  private baseDir: string; // data/users/
  
  constructor(baseDir: string)
  
  // Load dossier for a user. Returns empty string if no file exists.
  load(userId: string): string
  
  // Append new facts to the dossier. Creates file if needed.
  // Adds timestamp header for each update.
  append(userId: string, facts: string): void
  
  // Get the dossier path for a user
  getPath(userId: string): string
}
```

Dossier format (markdown):
```markdown
# Student Dossier
**Last updated**: 2026-05-08T10:30:00Z

## Academic Profile
- GPA: 3.8 unweighted, 4.2 weighted
- SAT: 1520 (750M, 770RW)
- AP: Calc BC (5), Physics C (4), CS A (5), US History (4)
- Class Rank: Top 10% (35/400)
- Intended Major: Computer Science / Electrical Engineering

## Target Schools
- Reach: MIT, Stanford, CMU
- Match: Georgia Tech, UIUC, Michigan
- Safety: Purdue, Virginia Tech

## Application Strategy
- Applying EA to MIT, Georgia Tech
- Prioritizing strong engineering programs with co-op opportunities
- Budget: under $60K/year
- Hooks: First-gen college student

## Past Questions & Key Insights
### 2026-05-08
- Asked about STEM school comparison — focused on MIT/CMU/Berkeley
- Discussed CS program rankings and research opportunities
- Concerned about cost — exploring merit aid options at public schools
```

### 2. MODIFY: server/src/types.ts
Add to SendMessagePayload:
```
userId?: string;
```

### 3. MODIFY: server/src/agent.ts
- Import DossierManager
- Initialize dossierManager singleton
- In createAgentStream():
  - Accept userId parameter
  - If userId provided, load dossier and inject into system prompt:
    Add to system message: `\n\n## Student Dossier (Persistent Profile)\n{dossierContent}`
- Add new function `extractDossierFacts()`:
  - After streaming completes, take the user query + assistant response
  - Call LLM with a short extraction prompt: "Extract 1-3 key facts about this student from the conversation. Focus on: academic stats, target schools, preferences, constraints, hooks. Return ONLY the facts as bullet points, no commentary."
  - Append extracted facts to dossier

### 4. MODIFY: server/src/index.ts
- Extract userId from send_message payload
- Pass userId to handleAgentQuery and createAgentStream
- After stream completes, call extractDossierFacts (async, don't block)

### 5. MODIFY: client/src/types.ts
Add to StudentProfile or create a UserInfo type:
```
userId?: string;
```
Add to ChatMessage:
```
userId?: string;
```

### 6. MODIFY: client/src/App.tsx
- Generate a persistent userId on first load (use crypto.randomUUID() or Date.now() + Math.random())
- Store in localStorage as 'college-advisor-user-id'
- Pass userId to ChatPanel

### 7. MODIFY: client/src/components/ChatPanel.tsx
- Accept userId prop
- Include userId in the send_message payload

### 8. MODIFY: client/src/components/ProfileCard.tsx or Header.tsx
- Show a subtle indicator that the dossier is active: "Dossier active" with green dot
- Optional: show when it was last updated

## Extraction Prompt (for extractDossierFacts)
```
You are extracting student profile facts for a persistent dossier. 
From the conversation below, extract 1-3 NEW facts about the student.
Focus on: academic stats, test scores, target schools, intended majors, 
budget constraints, application preferences, hooks (legacy/first-gen/etc), 
extracurricular depth, location preferences.

Only extract facts the student explicitly mentioned. Do NOT infer or assume.
Return ONLY bullet points. If nothing new was shared, return "NO_NEW_FACTS".

Conversation:
User: {userMessage}
Assistant: {assistantResponse}
```

## Dossier Injection Format
Add to the system prompt, right before the user message:
```
## Student Dossier
The following is a persistent profile built up over previous sessions. 
Use this to personalize your advice. This represents what we know about the student so far.

{dossierContent}
```

## Do NOT
- Create any new npm dependencies
- Change the WebSocket protocol fundamentally (add fields, don't restructure)
- Store PII in logs (console.log should not print dossier content)
- Break existing functionality
