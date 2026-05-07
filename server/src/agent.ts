import OpenAI from 'openai';
import { tavily as createTavilyClient } from '@tavily/core';
import type { TavilyClient } from '@tavily/core';
import type { StudentProfile } from './types';
import retriever from './knowledge/retriever.js';

import path from 'path';
import { fileURLToPath } from 'url';

// Load env
import dotenv from 'dotenv';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const LLM_BASE_URL = process.env.LLM_BASE_URL || 'https://opencode.ai/zen/go/v1';
const LLM_API_KEY = process.env.LLM_API_KEY || '';
const LLM_MODEL = process.env.LLM_MODEL || 'deepseek-v4-pro';
const TAVILY_API_KEY = process.env.TAVILY_API_KEY || '';

// Init clients
let openaiClient: OpenAI | null = null;
let tavilyClient: TavilyClient | null = null;
let retrieverLoaded = false;

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
const SYSTEM_PROMPT = `You are a professional US college admissions advisor, dedicated to helping US domestic high school students (and their parents) with college selection and application planning.

## Your Role
- Provide accurate, up-to-date college information (rankings, tuition, acceptance rates, graduation rates, etc.)
- Give personalized college recommendations based on student profile
- Explain the US college application process clearly
- Compare multiple schools objectively

## Interaction Style
- Always respond in English — your audience is US domestic students and families
- Be warm, patient, and encouraging — like a trusted college counselor
- Use structured output: clear headings, bullet points, and tables when comparing schools
- Always cite data sources when possible
- When you use search results, clearly indicate the source

## Key Topics You Cover
- US college rankings (US News, Niche, Forbes, etc.)
- Public vs private, liberal arts colleges vs research universities
- Cost of attendance, financial aid, scholarships for domestic students
- SAT/ACT prep and score ranges for target schools
- Application deadlines: Early Decision, Early Action, Regular Decision
- Essay topics, recommendation letters, extracurricular planning
- Campus visits, virtual tours, student life
- Major selection and career outcomes

## Important Notes
- Do NOT guarantee admission to any school
- Encourage students to apply to a balanced list (reach, match, safety schools)
- Remind users to verify critical info on official college websites
- Be sensitive to the stress of college applications; offer emotional support
- This tool is for US domestic students — do NOT reference Chinese universities, Gaokao, 985/211 schools, or international student-specific concerns unless explicitly asked
- When college profile data is provided from the knowledge base below, use it as your primary source. Supplement with web search only for time-sensitive data.`;

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
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: SYSTEM_PROMPT },
  ];

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
