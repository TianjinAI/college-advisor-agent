/**
 * Financial Aid Agent — specialized LLM stream for financial aid counseling.
 * Follows the same pattern as createAgentStream in agent.ts.
 */

import OpenAI from 'openai';
import faRetriever from './knowledge/faRetriever.js';
import { DossierManager } from './knowledge/dossier.js';
import type { FinancialProfile } from './types.js';

import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), 'server/.env') });

const LLM_BASE_URL = process.env.LLM_BASE_URL || 'https://opencode.ai/zen/go/v1';
const LLM_API_KEY = process.env.LLM_API_KEY || '';
const LLM_MODEL = process.env.LLM_MODEL || 'deepseek-v4-flash';

// In-memory caches
const searchCache = new Map<string, { content: string; expiry: number }>();
const SEARCH_TTL_MS = 10 * 60 * 1000; // 10 min

const dossierManager = new DossierManager(path.resolve(process.cwd(), '../data/users'));

function getOpenAI(): OpenAI {
  if (!LLM_API_KEY || LLM_API_KEY.includes('YOUR_KEY')) {
    throw new Error('LLM_API_KEY not configured.');
  }
  return new OpenAI({
    baseURL: LLM_BASE_URL,
    apiKey: LLM_API_KEY,
    defaultHeaders: {
      'User-Agent': 'OpenAI/1.0.0',
    },
  });
}

// ─── System Prompt ─────────────────────────────────────────────────────────────

const FA_SYSTEM_PROMPT = `You are a financial aid counselor — strategic, honest, and deeply knowledgeable about US college financial aid. You help families maximize the aid they receive through careful planning, not just application.

Your approach:
- Need-based first: understand the family's financial profile and SAI range
- Merit second: identify schools where the student's profile qualifies for merit aid
- Private scholarships: match student to realistic opportunities
- Timeline: all advice is anchored to real deadlines and milestones (FAFSA opens Oct 1, CSS Profile deadlines, school FA deadlines)
- CSS vs FAFSA: always clarify which applies and why it matters
- Appeal strategy: families often leave money on the table by not appealing

You do NOT:
- Compute exact EFC/SAI (direct them to studentaid.gov for official estimate)
- Advise on hiding assets (illegal — do not engage)
- Promise specific award amounts
- Do NOT give legal or tax advice

Student financial profile (in-session only, not stored):
{FINANCIAL_PROFILE}

Student's target schools (from college portal):
{SCHOOL_LIST}

Financial Aid Knowledge Base context:
{FA_KB_CONTEXT}`;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FAStream {
  [Symbol.asyncIterator](): AsyncIterator<{ text: string }>;
  abort(): Promise<void>;
}

export interface CreateFAStreamParams {
  content: string;
  financialProfile?: FinancialProfile;
  schoolList?: string[];
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  userId?: string;
  sessionId?: string;
  model?: string;
}

// ─── Build prompt with injected context ───────────────────────────────────────

function buildFAPrompt(
  userMessage: string,
  financialProfile?: FinancialProfile,
  schoolList?: string[],
): string {
  let fpBlock = '(not provided)';
  if (financialProfile) {
    const parts: string[] = [];
    parts.push(`Dependency Status: ${financialProfile.dependency_status}`);
    parts.push(`Household Size: ${financialProfile.household_size}`);
    parts.push(`In College: ${financialProfile.num_in_college}`);
    parts.push(`Parent Marital Status: ${financialProfile.parent_marital_status}`);
    parts.push(`Parent AGI: $${financialProfile.parent_agi.toLocaleString()}`);
    parts.push(`Parent Income Type: ${financialProfile.parent_income_type}`);
    parts.push(`Student Income: $${financialProfile.student_income.toLocaleString()}`);
    parts.push(`Parent Savings: $${financialProfile.parent_savings.toLocaleString()}`);
    parts.push(`Parent Investments: $${financialProfile.parent_investments.toLocaleString()}`);
    parts.push(`Home Equity: $${financialProfile.home_equity.toLocaleString()}`);
    parts.push(`Business Assets: $${financialProfile.business_assets.toLocaleString()}`);
    parts.push(`Student Assets: $${financialProfile.student_assets.toLocaleString()}`);
    parts.push(`529 Balance: $${financialProfile.balance_529.toLocaleString()}`);
    parts.push(`GPA: ${financialProfile.gpa}`);
    if (financialProfile.sat != null) parts.push(`SAT: ${financialProfile.sat}`);
    if (financialProfile.act != null) parts.push(`ACT: ${financialProfile.act}`);
    parts.push(`Class Rank: ${financialProfile.class_rank || 'N/A'}`);
    parts.push(`First-Generation: ${financialProfile.first_gen ? 'Yes' : 'No'}`);
    parts.push(`State of Residency: ${financialProfile.state_of_residency || 'N/A'}`);
    parts.push(`Citizenship: ${financialProfile.citizenship || 'N/A'}`);
    if (financialProfile.special_circumstances) {
      parts.push(`Special Circumstances: ${financialProfile.special_circumstances}`);
    }
    fpBlock = parts.join('\n');
  }

  const schoolBlock = schoolList?.length
    ? schoolList.map(s => `- ${s}`).join('\n')
    : '(not provided)';

  return [
    `Student Financial Profile:\n${fpBlock}`,
    ``,
    `Target Schools:\n${schoolBlock}`,
  ].join('\n');
}

// ─── Main stream creator ───────────────────────────────────────────────────────

export async function createFAStream(
  params: CreateFAStreamParams,
): Promise<FAStream> {
  const { content, financialProfile, schoolList, history, userId, sessionId, model } = params;
  let aborted = false;

  const effectiveModel = model || LLM_MODEL;

  // Step 1: Search FA KB for relevant context
  let kbContext = '';
  try {
    kbContext = faRetriever.search(content);
  } catch (err) {
    console.warn('[FA-Agent] KB search failed, continuing without context:', err);
    kbContext = '';
  }

  // Step 2: Build system prompt with injected context
  const systemPrompt = FA_SYSTEM_PROMPT
    .replace('{FINANCIAL_PROFILE}', financialProfile
      ? JSON.stringify(financialProfile, null, 2)
      : '(not provided)')
    .replace('{SCHOOL_LIST}', schoolList?.length
      ? schoolList.join('\n')
      : '(not provided)')
    .replace('{FA_KB_CONTEXT}', kbContext || '(No KB matches found)');

  // Step 3: Build messages
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
  ];

  // Inject conversation history (last 12 messages max)
  if (history?.length) {
    for (const h of history.slice(-12)) {
      messages.push({ role: h.role as 'user' | 'assistant', content: h.content });
    }
  }

  // Inject persistent dossier context if userId
  let fullContext = '';
  if (userId) {
    fullContext = await dossierManager.loadFullContext(userId);
    if (fullContext) {
      const existingSystem = messages[0].content as string;
      messages[0].content = existingSystem +
        '\n\n## Student Memory (Persistent Across Sessions)\n' + fullContext;
    }
  }

  // Add user question
  const userContent = buildFAPrompt(content, financialProfile, schoolList);
  messages.push({ role: 'user', content: userContent });

  console.log(`[FA-Agent] Calling LLM model=${effectiveModel} (KB hits: ${kbContext ? 'yes' : 'no'})`);

  // Step 4: Stream from LLM
  const client = getOpenAI();
  const stream = await client.chat.completions.create({
    model: effectiveModel,
    messages,
    stream: true,
    temperature: 0.4,
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
      try { await stream.controller?.abort(); } catch (_) { /* ignore */ }
    },
  };
}
