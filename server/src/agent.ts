import OpenAI from 'openai';
import { tavily as createTavilyClient } from '@tavily/core';
import type { TavilyClient } from '@tavily/core';
import type { StudentProfile } from './types';
import retriever from './knowledge/retriever.js';
import { DossierManager } from './knowledge/dossier.js';


import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), 'server/.env') });
import fs from 'fs';
const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const LLM_BASE_URL = process.env.LLM_BASE_URL || 'https://opencode.ai/zen/go/v1';
const LLM_API_KEY = process.env.LLM_API_KEY || '';
const LLM_MODEL = process.env.LLM_MODEL || 'deepseek-v4-flash';
const DOSSIER_MODEL = process.env.DOSSIER_MODEL || 'deepseek-v4-flash';
const TAVILY_API_KEY = process.env.TAVILY_API_KEY || '';

// In-memory caches
const dossierCache = new Map<string, { content: string; expiry: number }>();
const searchCache = new Map<string, { content: string; expiry: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;   // 5 min for dossier
const SEARCH_TTL_MS = 10 * 60 * 1000; // 10 min for web search

// Init clients
let openaiClient: OpenAI | null = null;
let tavilyClient: TavilyClient | null = null;
let retrieverLoaded = false;
const dossierManager = new DossierManager(path.resolve(process.cwd(), '../data/users'));
export { dossierManager, ensureRetriever };

async function ensureRetriever(): Promise<void> {
  if (retrieverLoaded) return;
  const dataDir = path.resolve(process.cwd(), './data');
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
      defaultHeaders: {
        'User-Agent': 'OpenAI/1.0.0',
      },
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
- Admissions odds assessment based on GPA, test scores, course rigor, and background
- Academic and cultural fit analysis — does the student match what the school looks for?
- Financial reality check — net price, debt burden, ROI by major
- Strategic application planning: ED/EA/RD timing, demonstrated interest, essay positioning
- Campus culture and academic environment — what the numbers don't tell you
- Major selection and long-term career outcomes
- Essay writing strategy: prompt selection, structural frameworks, narrative voice, revision

## Essay Writing Guidance
When students ask about essays (Common App, Why Us, supplemental, short answer):
- Reference the Essay Prompts from the KB — use the actual prompt text, word limits, and school-specific tips
- Reference the Essay Patterns from the KB — suggest structural frameworks appropriate to their story
- Do NOT give generic "be yourself" advice — give specific, actionable structural guidance
- Help students choose WHICH prompt to answer when they have a choice
- Push them toward specific patterns based on their story type (narrative arc vs. montage vs. counter-intuitive, etc.)
- Point out pitfalls from the KB for each specific prompt
- For Why Us / Why Major essays: reference specific programs, professors, courses — not generic praise
- Encourage revision: suggest they bring drafts back for feedback on structure, voice, and specificity
- Use the "Show, Don't Tell" principle — demand concrete scenes and specific details, not abstract claims

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
    if (profile.ethnic_group)  parts.push(`- Ethnic Group: ${profile.ethnic_group}`);
    if (profile.sex)            parts.push(`- Sex: ${profile.sex}`);
    if (profile.school_type)     parts.push(`- School Type: ${profile.school_type}`);
    parts.push('Please give personalized advice based on the above profile.\n');
    prompt += parts.join('\n');
  }

  return prompt;
}

/**
 * Search the web using Tavily for latest college data
 * With timeout to prevent hanging.
 * Results are cached for 10 minutes per query.
 */
async function searchWeb(query: string, maxResults: number = 5): Promise<string> {
  // Check cache first
  const cacheKey = query.toLowerCase().slice(0, 100);
  const cached = searchCache.get(cacheKey);
  if (cached && cached.expiry > Date.now()) {
    console.log(`[Tavily] Cache hit: "${query}"`);
    return cached.content;
  }

  try {
    const client = getTavily();
    console.log(`[Tavily] Searching: "${query}"`);

    const searchPromise = client.search(query, {
      maxResults,
      includeAnswer: true,
      includeRawContent: false,
    });
    // Add timeout wrapper (4 seconds — fast fail to avoid blocking response)
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Tavily search timeout (4s)')), 4000)
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

    const result = parts.length > 0 ? parts.join('\n\n') : '(No search results found)';
    // Cache the result
    searchCache.set(cacheKey, { content: result, expiry: Date.now() + SEARCH_TTL_MS });
    return result;
  } catch (err: any) {
    console.error('[Tavily] Search error:', err.message);
    return `[Search Error: ${err.message}]`;
  }
}

/**
 * Determine if a query needs web search.
 * Call AFTER KB search — kbContext tells us whether KB already answered it.
 * Only search web if KB is empty OR query asks for specific current data.
 */
function needsWebSearch(query: string, kbContext: string): boolean {
  if (!kbContext) return true; // KB empty → need web

  // Query specifically asking for time-sensitive/current numbers
  const needsCurrent = /^(what is|what's|what're|tell me the|current|latest)[\s]/i.test(query)
    || /\b(deadline|ea ed rd|early action|regular decision|tuition|cost to attend|room board|financial aid package|acceptance rate|admission rate|median sat|median act)\b/i.test(query)
    || /\b(20[2-9][0-9]\/|class of 202[5-9]|for 202[5-9]|ranking [#0-9]+|ranked [#0-9]+)\b/i.test(query);

  return needsCurrent;
}

/**
 * Essay review system prompt — strict structural feedback, no generic praise.
 */
const ESSAY_REVIEW_SYSTEM_PROMPT = `You are a professional US college admissions essay reviewer. Your job is to give rigorous, specific, and actionable feedback that helps students improve their essays.

## Review Framework
Structure every review with these sections:

### 1. Overall Assessment
2-3 sentences: what's working, what's not, whether the prompt is answered effectively.

### 2. Strengths
3-5 specific things the essay does well. Quote exact passages.

### 3. Areas for Improvement
For each issue: problem → specific quoted passage → concrete revision suggestion.

### 4. Prompt Alignment
Does the essay directly and compellingly answer the prompt? If off-target, explain how to realign.

### 5. Voice & Authenticity
Does it sound like a real teenager, or like a polished adult performing "essay voice"?

### 6. Structural Feedback
Weak hook? Muddled middle? Abrupt ending? Point to specific passages.

### 7. Revision Priorities
Top 3 changes for the next draft.

## Rules
- Be direct and specific. Quote the essay when critiquing.
- No generic praise ("Great job!"). Be granular ("Your opening line works because it...").
- Push for authenticity and specificity. "Show, don't tell" is not optional.
- Do NOT rewrite the essay. Guide the writer to revise themselves.
- Use markdown.`;

export interface AgentStream {
  [Symbol.asyncIterator](): AsyncIterator<{ text: string }>;
  abort(): Promise<void>;
}

/**
 * Create a dedicated essay review stream — no KB search, no web search,
 * uses the essay review system prompt directly.
 */
const SUMMER_RECOMMEND_SYSTEM_PROMPT = `You are an expert summer program advisor for US high school students. Your job is to recommend the best-fit summer programs from the provided list based on the student's profile, interests, and application status.

## Response Format
For every program you recommend, structure your response as:

### [Program Name]
- **Signal Strength**: Strong/Positive/Neutral/Mixed — how much this helps college admissions
- **Fit Score**: 1-5 stars — how well this fits the student's specific profile
- **Why this program**: 2-3 sentences explaining the fit
- **Application tip**: One specific thing to highlight in the application
- **Realistic odds**: Your honest assessment of whether this student would get in

### Programs to be cautious about
- Explain why a program might not be the right fit
- Flag selectivity concerns if the student's profile doesn't match

## Rules
- Be specific — reference the student's actual interests, not generic lists
- Reference programs by their full names from the KB
- Be honest about selectivity — don't oversell reach programs
- Flag programs the student is already tracking (to avoid duplicates)
- Prioritize free and prestigious programs first
- Always mention the application deadline
- Use markdown tables for comparisons when recommending 3+ programs`;

export async function createSummerRecommendStream(
  programsJson: string,
  studentProfile: {
    interests?: string[];
    budget?: number;
    applied_programs?: string[];
    rejected_programs?: string[];
    grade_level?: string;
    academic_strength?: string;
  },
  model?: string,
): Promise<AgentStream> {
  let aborted = false;

  const effectiveModel = model || LLM_MODEL;

  const userContent = [
    `## Available Summer Programs (KB)`,
    programsJson,
    '',
    `## Student Profile`,
    `- Interests: ${studentProfile.interests?.join(', ') || 'Not specified'}`,
    `- Budget: ${studentProfile.budget === 0 ? 'Free only' : studentProfile.budget ? `Up to $${studentProfile.budget}` : 'Not specified'}`,
    `- Grade Level: ${studentProfile.grade_level || 'Not specified'}`,
    `- Academic Strength: ${studentProfile.academic_strength || 'Not specified'}`,
    `- Already Applied: ${studentProfile.applied_programs?.join(', ') || 'None'}`,
    `- Rejected/Waitlisted: ${studentProfile.rejected_programs?.join(', ') || 'None'}`,
    '',
    `Based on the above, recommend the best-fit programs. Group by category (Math, STEM/Research, Leadership, Writing, General Prestige). Include a shortlist of top 5 with fit scores and a broader list of good fits. Mention any upcoming deadlines.`,
  ].join('\n');

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: SUMMER_RECOMMEND_SYSTEM_PROMPT },
    { role: 'user', content: userContent },
  ];

  console.log(`[SummerRecommend] Calling LLM model=${effectiveModel}`);

  const client = getOpenAI();
  const stream = await client.chat.completions.create({
    model: effectiveModel,
    messages,
    stream: true,
    temperature: 0.5,
    max_tokens: 16384,
    max_completion_tokens: 16384,
    // @ts-ignore
    reasoning_effort: 'low',
  });

  const iterator = stream[Symbol.asyncIterator]();

  return {
    [Symbol.asyncIterator]() {
      return {
        async next() {
          if (aborted) return { value: undefined, done: true };
          const result = await iterator.next();
          if (result.done) return { value: undefined, done: true };
          const choice = result.value.choices?.[0];
          const delta = choice?.delta;
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

export async function createEssayReviewStream(
  userContent: string,
  model?: string,
): Promise<AgentStream> {
  let aborted = false;

  const effectiveModel = model || LLM_MODEL;

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: ESSAY_REVIEW_SYSTEM_PROMPT },
    { role: 'user', content: userContent },
  ];

  console.log(`[EssayReview] Calling LLM model=${effectiveModel}`);

  const client = getOpenAI();
  const stream = await client.chat.completions.create({
    model: effectiveModel,
    messages,
    stream: true,
    temperature: 0.5,
    max_tokens: 16384,
    max_completion_tokens: 16384,
    // @ts-ignore
    reasoning_effort: 'low',
  });

  const iterator = stream[Symbol.asyncIterator]();

  return {
    [Symbol.asyncIterator]() {
      return {
        async next() {
          if (aborted) return { value: undefined, done: true };
          const result = await iterator.next();
          if (result.done) return { value: undefined, done: true };
          const choice = result.value.choices?.[0];
          const delta = choice?.delta;
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

/**
 * Create an agent response stream
 */
export async function createAgentStream(
  userMessage: string,
  profile?: StudentProfile,
  history?: Array<{ role: 'user' | 'assistant'; content: string }>,
  userId?: string,
  sessionId?: string,
  model?: string,
): Promise<AgentStream> {
  let prompt = buildPrompt(userMessage, profile);

  // Inject uploaded document text into prompt
  if (profile?.documents?.length) {
    try {
      const uploadsDir = path.resolve(process.cwd(), 'data/uploads');
      const docTexts: string[] = [];
      for (const doc of profile.documents) {
        const files = fs.readdirSync(uploadsDir).filter(f => f.startsWith(doc.id));
        if (files.length === 0) continue;
        const ext = files[0].slice(files[0].lastIndexOf('.')).toLowerCase();
        const buf = fs.readFileSync(path.join(uploadsDir, files[0]));
        if (['.txt', '.md', '.rtf'].includes(ext)) {
          const text = buf.toString('utf-8').slice(0, 8000); // cap at 8KB per doc
          docTexts.push(`\n---\n[Attached: ${doc.filename} (${doc.type})]\n${text}\n---`);
        } else {
          docTexts.push(`\n---\n[Attached: ${doc.filename} (${doc.type}) — ${doc.type === 'resume' ? 'resume' : doc.type === 'essay' ? 'essay/writing sample' : 'document'}, uploaded ${new Date(doc.uploadedAt).toLocaleDateString()}]\n---`);
        }
      }
      if (docTexts.length) {
        prompt += '\n\n[Student Uploaded Documents]\n' + docTexts.join('\n');
      }
    } catch (err: any) {
      console.error('[Agent] Failed to read uploaded docs:', err?.message || err);
    }
  }
  let aborted = false;

  // Step 1: Always search KB first — this is our primary source
  await ensureRetriever();
  const kbContext = searchKB(userMessage);

  // Step 2: Only web search if KB is empty OR query specifically asks for current numbers
  let searchContext = '';
  if (needsWebSearch(userMessage, kbContext)) {
    const searchQuery = userMessage
      .replace(/推荐|recommend/gi, 'best')
      .replace(/对比|compare/gi, 'compare')
      .slice(0, 200);
    searchContext = await searchWeb(searchQuery);
    console.log(`[Agent] Search context length: ${searchContext.length}`);
  }

  // Step 2: Build messages for LLM
  // Client-provided model takes priority; fall back to server default
  const effectiveModel = model || LLM_MODEL;
  const cacheKey = userId ? `dossier:${userId}` : '';
  let fullContext = '';
  if (cacheKey) {
    const cached = dossierCache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      console.log('[Dossier] Cache hit for user:', userId);
      fullContext = cached.content;
    }
  }
  if (!fullContext && userId) {
    fullContext = await dossierManager.loadFullContext(userId);
    if (cacheKey) {
      dossierCache.set(cacheKey, { content: fullContext, expiry: Date.now() + CACHE_TTL_MS });
    }
  }
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
    model: effectiveModel,
    messages,
    stream: true,
    temperature: 0.5,
    max_tokens: 16384,
    max_completion_tokens: 16384,
    // @ts-ignore — reasoning_effort: 'low' maximizes content output vs internal thinking
    reasoning_effort: 'low',
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
    if (profile?.ethnic_group) facts.push(`- Ethnic Group: ${profile.ethnic_group}`);
    if (profile?.sex) facts.push(`- Sex: ${profile.sex}`);
    if (profile?.budget) facts.push(`- Budget: $${profile.budget}/year`);
    if (profile?.target_states) facts.push(`- Target States: ${profile.target_states}`);
    if (profile?.extracurriculars) facts.push(`- Activities: ${profile.extracurriculars}`);
    if (facts.length > 0) {
      await dossierManager.saveDossier(userId, facts.join('\n'), 'profile fields');
    }
  }
}
