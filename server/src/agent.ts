import OpenAI from 'openai';
import { tavily as createTavilyClient } from '@tavily/core';
import type { TavilyClient } from '@tavily/core';
import type { StudentProfile } from './types';
import retriever from './knowledge/retriever.js';
import { DossierManager } from './knowledge/dossier.js';

import path from 'path';
import { fileURLToPath } from 'url';

// Load env
import dotenv from 'dotenv';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const LLM_BASE_URL = process.env.LLM_BASE_URL || 'https://opencode.ai/zen/go/v1';
const LLM_API_KEY = process.env.LLM_API_KEY || '';
const LLM_MODEL = process.env.LLM_MODEL || 'deepseek-v4-pro';
const DOSSIER_MODEL = process.env.DOSSIER_MODEL || 'deepseek-v4-pro';
const TAVILY_API_KEY = process.env.TAVILY_API_KEY || '';

// Init clients
let openaiClient: OpenAI | null = null;
let tavilyClient: TavilyClient | null = null;
let retrieverLoaded = false;
const dossierManager = new DossierManager(path.resolve(__dirname, '../../data/users'));
export { dossierManager };

async function ensureRetriever(): Promise<void> {
  if (retrieverLoaded) return;
  const dataDir = path.resolve(__dirname, '../../data');
  await retriever.load(dataDir);
  retrieverLoaded = true;
  console.log('[KB] Retriever loaded:', JSON.stringify(retriever.getStats()));
}

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

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    if (!LLM_API_KEY || LLM_API_KEY.includes('YOUR_KEY')) {
      throw new Error('LLM_API_KEY not configured.');
    }
    openaiClient = new OpenAI({
      baseURL: LLM_BASE_URL,
      apiKey: LLM_API_KEY,
    });
  }
  return openaiClient;
}

function getTavily(): TavilyClient {
  if (!tavilyClient) {
    if (!TAVILY_API_KEY || TAVILY_API_KEY.includes('YOUR_KEY')) {
      throw new Error('TAVILY_API_KEY not configured.');
    }
    tavilyClient = createTavilyClient({ apiKey: TAVILY_API_KEY });
  }
  return tavilyClient;
}

// System prompt
const SYSTEM_PROMPT = `You are a professional US college admissions analyst. Your purpose is to provide rigorous, data-driven, and critically honest guidance to US domestic high school students navigating college selection and applications.

## Your Role
- Provide accurate, evidence-based college information from the knowledge base and web search
- Give personalized, critical assessments based on the student's profile — not generic encouragement
- Explain the US college application process with clarity and precision
- Compare schools objectively, highlighting trade-offs, weaknesses, and risks alongside strengths
- Help students think strategically about reach/match/safety balance

## Interaction Style
- Be direct, analytical, and evidence-based — not flattering or pampering
- Use structured output: clear headings, bullet points, and tables when comparing schools
- Always cite data sources and the knowledge base when available
- Challenge students to think critically about their profile, odds, and fit
- If a student's profile is not competitive for a school, say so plainly and explain why

## Key Topics You Cover
- Admissions odds assessment based on GPA, test scores, course rigor, and hooks
- Academic and cultural fit analysis — does the student match what the school looks for?
- Financial reality check — net price, debt burden, ROI by major
- Strategic application planning: ED/EA/RD timing, demonstrated interest, essay positioning
- Campus culture and academic environment — what the numbers don't tell you
- Major selection and long-term career outcomes

## Critical Thinking Standards
- Never flatter or offer empty reassurance. Be honest even when the truth is uncomfortable.
- When comparing schools, always mention what each school does NOT offer — not just the highlights
- For every recommendation, explain the downside or trade-off
- Push back on prestige-chasing — recommend schools based on fit, not brand
- Remind students that admissions is probabilistic, not a judgment of their worth
- Encourage students to apply to a balanced list with genuine safeties they would attend

## Rules
- Do NOT guarantee admission to any school — ever
- Always remind users to verify critical info on official college websites
- This tool is for US domestic students — do NOT reference Chinese universities, Gaokao, 985/211 schools, or international student concerns unless explicitly asked
- When knowledge base data is provided, use it as your primary source. Supplement with web search only for time-sensitive or missing information.`;

/**
 * Build enhanced prompt with student profile context
 */
function buildPrompt(userMessage: string, profile?: StudentProfile): string {
  let prompt = userMessage;

  if (profile) {
    const parts: string[] = ['\n[Student Profile Context]'];
    if (profile.gpa)             parts.push(`- GPA: ${profile.gpa} (${profile.gpa_scale || 'Unweighted'})`);
    if (profile.sat_score)       parts.push(`- SAT Score: ${profile.sat_score}`);
    if (profile.act_score)       parts.push(`- ACT Score: ${profile.act_score}`);
    if (profile.ap_ib_classes)   parts.push(`- AP/IB Classes: ${profile.ap_ib_classes}`);
    if (profile.class_rank)      parts.push(`- Class Rank: ${profile.class_rank}`);
    if (profile.intended_majors) parts.push(`- Intended Major(s): ${profile.intended_majors}`);
    if (profile.interests)       parts.push(`- Academic Interests: ${profile.interests}`);
    if (profile.budget)          parts.push(`- Annual Budget (USD): ${profile.budget}`);
    if (profile.target_states)   parts.push(`- Preferred States: ${profile.target_states}`);
    if (profile.extracurriculars) parts.push(`- Extracurriculars: ${profile.extracurriculars}`);
    if (profile.awards_honors)   parts.push(`- Awards & Honors: ${profile.awards_honors}`);
    if (profile.hooks?.length)   parts.push(`- Hooks: ${profile.hooks.join(', ')}`);
    if (profile.school_type)     parts.push(`- School Type: ${profile.school_type}`);
    parts.push('Please give personalized advice based on the above profile.\n');
    prompt += parts.join('\n');
  }

  return prompt;
}

/**
 * Search the web using Tavily for latest college data
 * With timeout to prevent hanging.
 */
async function searchWeb(query: string, maxResults: number = 5): Promise<string> {
  try {
    const client = getTavily();
    console.log(`[Tavily] Searching: "${query}"`);

    // Add timeout wrapper (8 seconds)
    const searchPromise = client.search(query, {
      maxResults,
      includeAnswer: true,
      includeRawContent: false,
    });
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Tavily search timeout (8s)')), 8000)
    );

    const response = await Promise.race([searchPromise, timeoutPromise]);

    console.log(`[Tavily] Got ${response.results?.length || 0} results`);

    const parts: string[] = [];
    if (response.answer) {
      parts.push(`Search Summary: ${response.answer}`);
    }
    for (const result of response.results || []) {
      parts.push(`[${result.title}](${result.url}): ${result.content}`);
    }

    return parts.length > 0 ? parts.join('\n\n') : '(No search results found)';
  } catch (err: any) {
    console.error('[Tavily] Search error:', err.message);
    return `[Search Error: ${err.message}]`;
  }
}

/**
 * Determine if a query needs web search
 */
function needsSearch(query: string): boolean {
  const searchKeywords = [
    'ranking', 'rank', 'acceptance rate', 'admission rate',
    'tuition', 'scholarship', 'deadline',
    'SAT', 'ACT', 'latest', '2025', '2026',
    'compare', 'recommend',
    'GPA', 'average',
  ];
  const lower = query.toLowerCase();
  if (!searchKeywords.some(kw => lower.includes(kw))) {
    return false;
  }

  // If KB is loaded and found results, skip web search unless time-sensitive
  if (retrieverLoaded && searchKB(query).length > 0) {
    const timeKws = ['deadline', 'ranking', '2025', '2026', 'latest', 'new', 'updated', 'announced'];
    if (!timeKws.some(kw => lower.includes(kw))) return false;
  }
  return true;
}

export interface AgentStream {
  [Symbol.asyncIterator](): AsyncIterator<{ text: string }>;
  abort(): Promise<void>;
}

/**
 * Create an agent response stream
 */
export async function createAgentStream(
  userMessage: string,
  profile?: StudentProfile,
  history?: Array<{ role: 'user' | 'assistant'; content: string }>,
  userId?: string,
  sessionId?: string,
): Promise<AgentStream> {
  const prompt = buildPrompt(userMessage, profile);
  let aborted = false;

  // KB lookup first
  await ensureRetriever();
  const kbContext = searchKB(userMessage);
  
  // If KB has strong matches, reduce reliance on web search
  const hasTimeKeywords = /\b(deadline|ranking|2025|2026|latest|new|updated|tuition 202|announced)\b/i.test(userMessage);

  // Step 1: Web search if needed
  let searchContext = '';
  if (needsSearch(userMessage) && (!kbContext || hasTimeKeywords)) {
    const searchQuery = userMessage
      .replace(/推荐|recommend/gi, 'best')
      .replace(/对比|compare/gi, 'compare')
      .slice(0, 200);
    searchContext = await searchWeb(searchQuery);
    console.log(`[Agent] Search context length: ${searchContext.length}`);
  }

  // Step 2: Build messages for LLM
  const fullContext = userId ? await dossierManager.loadFullContext(userId) : '';
  const storedSessionHistory = userId && sessionId
    ? await dossierManager.loadMessages(userId, sessionId)
    : [];
  const effectiveHistory = history?.length
    ? history
    : storedSessionHistory.map((message) => ({ role: message.role, content: message.content }));
  const systemPrompt = fullContext
    ? `${SYSTEM_PROMPT}\n\n## Student Memory (Persistent Across Sessions)\n${fullContext}`
    : SYSTEM_PROMPT;

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
  ];

  // Inject conversation history (last N messages for context)
  if (effectiveHistory.length > 0) {
    for (const h of effectiveHistory.slice(-12)) { // keep last 12 messages max
      messages.push({ role: h.role as 'user' | 'assistant', content: h.content });
    }
  }

  const userContent = [
    kbContext ? `[Knowledge Base Results]\n${kbContext}` : '',
    searchContext ? `[Web Search Results]\n${searchContext}` : '',
    `[User Question]\n${prompt}`
  ].filter(Boolean).join('\n\n---\n\n');

  messages.push({ role: 'user', content: userContent });

  console.log(`[Agent] Calling LLM with ${messages.length} messages`);

  // Step 3: Call LLM with streaming
  const client = getOpenAI();
  const stream = await client.chat.completions.create({
    model: LLM_MODEL,
    messages,
    stream: true,
    temperature: 0.7,
    max_tokens: 8192,
    max_completion_tokens: 8192,
    // @ts-ignore — DeepSeek-specific: prevent all tokens going to reasoning
    reasoning_effort: 'medium',
  });

  console.log(`[Agent] LLM stream created, starting iteration...`);

  // Wrap in async iterator
  const iterator = stream[Symbol.asyncIterator]();

  return {
    [Symbol.asyncIterator]() {
      return {
        async next() {
          if (aborted) {
            console.log('[Agent] Aborted');
            return { value: undefined, done: true };
          }

          const result = await iterator.next();
          if (result.done) {
            console.log('[Agent] Stream done');
            return { value: undefined, done: true };
          }

          const choice = result.value.choices?.[0];
          const delta = choice?.delta;
          // DeepSeek returns reasoning_content separately — prefer content, fallback to reasoning
          const text = delta?.content || '';
          return { value: { text }, done: false };
        },
      };
    },
    async abort() {
      aborted = true;
      try { await stream.controller?.abort(); } catch (_) {}
    },
  };
}

export async function extractDossierFacts(
  userMessage: string,
  assistantResponse: string,
  userId?: string,
  profile?: StudentProfile,
): Promise<void> {
  if (!userId) {
    console.log('[Dossier] Skipping — no userId');
    return;
  }

  // Load existing dossier to deduplicate
  const existingDossier = await dossierManager.loadDossier(userId);
  
  try {
    const client = getOpenAI();
    
    const extractionPrompt = `You are building a student profile Wiki page for a college admissions advisor. This is a LIVING document that captures not just stats, but the student's CONTEXT, NARRATIVE, and EVOLUTION over time.

## Existing Wiki page (what we already know):
${existingDossier || '(empty — first session)'}

## Latest conversation:
User: ${userMessage.substring(0, 2000)}
Assistant: ${assistantResponse.substring(0, 2500)}

## Your task
Extract NEW information to update the Wiki page. Return raw wiki content (NOT markdown bullets under "## Updates").

Focus on capturing what makes this student DISTINCT — two students with identical SAT scores can have completely different profiles based on context:

### Sections to populate/update (only if new info exists):

**Academic Snapshot**
- GPA, test scores, course rigor, class rank — but also CONTEXT: grade trends, school competitiveness, course availability

**Origin & Background** (CRITICAL — this is what separates identical stats)
- Where they're from, school type, family context, first-gen status
- Challenges overcome, advantages they had, unique circumstances
- Language, culture, community context
- Anything that shapes their perspective or opportunities

**What They Want**
- Majors, career vision, what problems they want to solve
- Campus preferences (urban/rural, size, culture, weather)
- What matters TO THEM (not what US News says matters)

**Target Schools & Strategy**
- Schools mentioned, reach/match/safety reasoning
- Application timing (ED/EA/RD), demonstrated interest
- Geographic preferences, budget constraints

**Evolving Concerns & Questions**
- Anxieties, doubts, things they're wrestling with
- Changing preferences over time
- Misconceptions the advisor corrected

**Key Advisor Insights Given**
- Important advice or frameworks shared
- Trade-offs explained, myths debunked

## Rules
- Only add information EXPLICITLY shared. Mark confidence: [high] [medium] [low]
- If a fact already exists in the Wiki, UPDATE it rather than duplicating
- If NOTHING new was shared, return exactly: NO_NEW_FACTS
- Write in Wiki page format with ## section headers, not bullet-list updates
- Include ALL existing content PLUS new content (return the FULL updated page)
- Keep it scannable — the agent reads this as context on every query`;

    const completion = await client.chat.completions.create({
      model: DOSSIER_MODEL,
      messages: [{ role: 'user', content: extractionPrompt }],
      temperature: 0.3,
      max_tokens: 2000,
      // @ts-ignore
      reasoning_effort: 'low',
    });

    const raw = completion.choices?.[0]?.message?.content?.trim() || '';
    console.log(`[Dossier] LLM extraction result: "${raw.substring(0, 120)}${raw.length > 120 ? '...' : ''}"`);

    if (!raw || raw === 'NO_NEW_FACTS') {
      console.log('[Dossier] No new facts from LLM');
      return;
    }

    // The LLM returns the full updated wiki page
    console.log(`[Dossier] Wiki page updated via LLM for ${userId.substring(0, 8)}... (${raw.length} chars)`);
    
    const sourceSummary = userMessage.length > 80 
      ? userMessage.substring(0, 80) + '...' 
      : userMessage;
    await dossierManager.saveDossier(userId, raw, sourceSummary);
    console.log('[Dossier] Saved to', dossierManager.getDossierPath(userId));

  } catch (err: any) {
    console.error('[Dossier] LLM extraction failed:', err?.message || err);
    // Fall back to basic profile extraction (original behavior)
    const facts: string[] = [];
    if (profile?.gpa) facts.push(`- GPA: ${profile.gpa} (${profile.gpa_scale || 'unweighted'})`);
    if (profile?.sat_score) facts.push(`- SAT: ${profile.sat_score}`);
    if (profile?.act_score) facts.push(`- ACT: ${profile.act_score}`);
    if (profile?.intended_majors) facts.push(`- Intended Major: ${profile.intended_majors}`);
    if (profile?.hooks?.length) facts.push(`- Hooks: ${profile.hooks.join(', ')}`);
    if (profile?.budget) facts.push(`- Budget: $${profile.budget}/year`);
    if (profile?.target_states) facts.push(`- Target States: ${profile.target_states}`);
    if (profile?.extracurriculars) facts.push(`- Activities: ${profile.extracurriculars}`);
    if (facts.length > 0) {
      await dossierManager.saveDossier(userId, facts.join('\n'), 'profile fields');
    }
  }
}
