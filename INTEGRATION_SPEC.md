# Agent Integration Spec — Wire Knowledge Retriever into agent.ts

## Overview
Modify server/src/agent.ts to integrate the knowledge retriever from server/src/knowledge/retriever.ts.

## Files to Read First
- server/src/agent.ts — current agent (232 lines, OpenAI + Tavily, streaming)
- server/src/knowledge/retriever.ts — retriever (exports default singleton, has: load(dataDir), buildContext(query, maxColleges, maxInsights), getStats())

## Changes Required (agent.ts only)

### 1. Import
Add at top after existing imports:
```
import retriever from './knowledge/retriever.js';
```

### 2. Lazy init
Add after imports, before getOpenAI():
```
let retrieverLoaded = false;

async function ensureRetriever(): Promise<void> {
  if (retrieverLoaded) return;
  const dataDir = path.resolve(__dirname, '../../data');
  await retriever.load(dataDir);
  retrieverLoaded = true;
  console.log('[KB] Retriever loaded:', JSON.stringify(retriever.getStats()));
}
```

### 3. KB search function  
Add after ensureRetriever():
```
function searchKB(userMessage: string): string {
  if (!retrieverLoaded) return '';
  const ctx = retriever.buildContext(userMessage, 3, 3);
  if (ctx) {
    console.log('[KB] Found context for query');
  } else {
    console.log('[KB] No matches for query');
  }
  return ctx;
}
```

### 4. Modify createAgentStream()
In the createAgentStream function, after the buildPrompt call and BEFORE the `if (needsSearch(userMessage))` line, add:
```
  // KB lookup first
  await ensureRetriever();
  const kbContext = searchKB(userMessage);
  
  // If KB has strong matches, reduce reliance on web search
  const hasTimeKeywords = /\b(deadline|ranking|2025|2026|latest|new|updated|tuition 202|announced)\b/i.test(userMessage);
```

Then modify the search section to:
```
  let searchContext = '';
  if (needsSearch(userMessage) && (!kbContext || hasTimeKeywords)) {
    // web search as before
  }
```

Then modify the userContent assembly to include kbContext before searchContext:
```
  const userContent = [
    kbContext ? `[Knowledge Base Results]\n${kbContext}` : '',
    searchContext ? `[Web Search Results]\n${searchContext}` : '',
    `[User Question]\n${prompt}`
  ].filter(Boolean).join('\n\n---\n\n');
```

### 5. Update SYSTEM_PROMPT
Around line 76, before the closing backtick, add to the Important Notes section:
```
- When college profile data is provided from the knowledge base below, use it as your primary source. Supplement with web search only for time-sensitive data.
```

### 6. Update needsSearch()
After the existing keyword array, add at the end of needsSearch():
```
  // If KB is loaded and found results, skip web search unless time-sensitive
  if (retrieverLoaded && searchKB(query).length > 0) {
    const timeKws = ['deadline', 'ranking', '2025', '2026', 'latest', 'new', 'updated', 'announced'];
    if (!timeKws.some(kw => lower.includes(kw))) return false;
  }
  return true;
```

## Constraints
- Do NOT modify any other file
- Preserve all existing functionality
- Keep the WebSocket streaming interface intact
- Use .js extension for ESM imports (e.g., './knowledge/retriever.js')
