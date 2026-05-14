import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { createAgentStream, extractDossierFacts, dossierManager, ensureRetriever, createEssayReviewStream, createSummerRecommendStream } from './agent';
import type { SendMessagePayload, TextDeltaPayload, ErrorPayload, StudentProfile, SessionChatMessage } from './types';
import sessionsRouter from './routes/sessions.js';
import essaysRouter from './routes/essays.js';
import summerProgramsRouter from './routes/summerPrograms.js';
import uploadRouter from './routes/upload.js';
import authRouter from './routes/auth.js';
import { verifyToken } from './auth/auth.js';

// Load env

import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), 'server/.env') });

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;
const IS_PROD = process.env.NODE_ENV === 'production';
const app = express();
app.use(cors());
app.use(express.json());
app.use(sessionsRouter);
app.use('/api/essays', essaysRouter);
app.use('/api/summer-programs', summerProgramsRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/auth', authRouter);

// Health check (must be first, before any static middleware)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'college-advisor-agent', env: IS_PROD ? 'production' : 'development' });
});

// Available models endpoint
app.get('/api/models', async (_req, res) => {
  try {
    const fetch = (await import('node-fetch')).default;
    const resp = await fetch(`${process.env.LLM_BASE_URL || 'https://opencode.ai/zen/go/v1'}/models`, {
      headers: { 'Authorization': `Bearer ${process.env.LLM_API_KEY || ''}` }
    });
    if (!resp.ok) throw new Error(`Upstream ${resp.status}`);
    const data = await resp.json() as any;
    const models: string[] = (data.data || []).map((m: any) => m.id);
    res.json({ models, default: process.env.LLM_MODEL || 'deepseek-v4-flash' });
  } catch (e: any) {
    res.json({ models: ['deepseek-v4-flash'], default: 'deepseek-v4-flash', error: e.message });
  }
});

// Serve React static files in production (after API routes, before SPA fallback)
if (IS_PROD) {
  const clientDist = path.resolve(process.cwd(), '../client/dist');
  app.use(express.static(clientDist));
  // SPA fallback: serve index.html for all non-API routes
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

const server = createServer(app);
const wss = new WebSocketServer({ server });

// Store active streams for abort
const activeStreams = new Map<WebSocket, { abort(): Promise<void> }>();

// Authenticated WebSocket connections — map of ws → auth payload
const wsAuth = new Map<WebSocket, { userId: string; username: string; displayName: string }>();

wss.on('connection', (ws, req) => {
  // Verify JWT from query param ?token=...
  const url = new URL(req.url || '', `http://${req.headers.host}`);
  const token = url.searchParams.get('token');
  if (token) {
    const payload = verifyToken(token);
    if (payload) {
      wsAuth.set(ws, payload);
      console.log(`[WS] Authenticated: ${payload.username} (${payload.userId})`);
    } else {
      console.log('[WS] Invalid token, treating as unauthenticated');
    }
  } else {
    console.log('[WS] No token provided');
  }

  console.log(`[WS] Client connected. Total: ${wss.clients.size}`);

  ws.on('message', async (raw) => {
    try {
      const msg = JSON.parse(raw.toString()) as { type: string; payload: unknown };
      console.log(`[WS] Received: ${msg.type}`);

      switch (msg.type) {
        case 'send_message': {
          // Prefer authenticated userId from JWT; fall back to payload userId
          const authPayload = wsAuth.get(ws);
          const { content, profile, history, userId: payloadUserId, sessionId, model } = msg.payload as SendMessagePayload;
          const userId = authPayload?.userId || payloadUserId;
          await handleAgentQuery(ws, content, profile, history, userId, sessionId, model);
          break;
        }
        case 'abort': {
          const stream = activeStreams.get(ws);
          if (stream) await stream.abort();
          break;
        }
        case 'set_model': {
          // Client wants to switch models — acknowledge
          const { model } = msg.payload as { model: string };
          console.log(`[WS] Model switch: ${model}`);
          ws.send(JSON.stringify({ type: 'model_set', payload: { model } }));
          break;
        }
        case 'review_essay': {
          const authPayload = wsAuth.get(ws);
          const { essayId, essayText, promptId, promptLabel, promptText, wordLimit, tips, pitfalls, userId: payloadUserId, model } = msg.payload as {
            essayId: string;
            essayText: string;
            promptId: string;
            promptLabel: string;
            promptText: string;
            wordLimit: string;
            tips: string[];
            pitfalls: string[];
            userId?: string;
            model?: string;
          };
          const userId = authPayload?.userId || payloadUserId;
          await handleEssayReview(ws, { essayId, essayText, promptId, promptLabel, promptText, wordLimit, tips, pitfalls, userId, model });
          break;
        }
        case 'summer_recommend': {
          const authPayload = wsAuth.get(ws);
          const { userId: payloadUserId, profile, interests, budget, application_status, model } = msg.payload as {
            userId?: string;
            profile?: StudentProfile;
            interests?: string[];
            budget?: number;
            application_status?: string;
            model?: string;
          };
          const userId = authPayload?.userId || payloadUserId;
          await handleSummerRecommend(ws, { userId, profile, interests, budget, application_status, model });
          break;
        }
        default:
          ws.send(JSON.stringify({ type: 'error', payload: { text: `Unknown message type: ${msg.type}` } }));
      }
    } catch (err: any) {
      console.error('[WS] Message error:', err);
      ws.send(JSON.stringify({ type: 'error', payload: { text: err.message } }));
    }
  });

  ws.on('close', () => {
    console.log(`[WS] Client disconnected. Total: ${wss.clients.size - 1}`);
    const stream = activeStreams.get(ws);
    if (stream) { stream.abort().catch(() => {}); activeStreams.delete(ws); }
    wsAuth.delete(ws);
  });
});

/**
 * Handle Agent query with streaming response
 */
async function handleAgentQuery(
  ws: WebSocket,
  content: string,
  profile?: StudentProfile,
  history?: Array<{ role: 'user' | 'assistant'; content: string }>,
  userId?: string,
  sessionId?: string,
  model?: string,
): Promise<void> {
  const messageId = `msg_${Date.now()}`;

  // Send start marker
  ws.send(JSON.stringify({
    type: 'text_start',
    payload: { messageId },
  }));

  try {
    const agentStream = await createAgentStream(content, profile, history, userId, sessionId, model);
    activeStreams.set(ws, { abort: () => agentStream.abort() });

    let hasText = false;
    let fullResponse = '';

    for await (const message of agentStream) {
      if (ws.readyState !== WebSocket.OPEN) break;

      if (message.text) {
        const payload: TextDeltaPayload = {
          text: message.text,
          done: false,
          messageId,
        };
        ws.send(JSON.stringify({ type: 'text_delta', payload }));
        hasText = true;
        fullResponse += message.text;
      }
    }

    // Send done marker
    const endPayload: TextDeltaPayload = { text: '', done: true, messageId };
    ws.send(JSON.stringify({ type: 'text_delta', payload: endPayload }));

    if (!hasText) {
      const noContent: TextDeltaPayload = {
        text: '(No response received. Please try again.)',
        done: true,
        messageId,
      };
      ws.send(JSON.stringify({ type: 'text_delta', payload: noContent }));
    } else {
      extractDossierFacts(content, fullResponse, userId, profile).catch(err => {
        console.error('[Dossier] Async extraction failed:', err?.message || err);
      });
      // Log the conversation for cumulative knowledge
      if (userId && fullResponse) {
        // Use first 500 chars of response as summary
        const summary = fullResponse.substring(0, 500).replace(/\n/g, ' ').trim();
        dossierManager.appendConversation(userId, content, summary).catch(err => {
          console.error('[Conversation] Log failed:', err?.message || err);
        });
      }
      if (userId && sessionId) {
        const existingMessages = await dossierManager.loadMessages(userId, sessionId);
        const sessionMessages: SessionChatMessage[] = [
          ...existingMessages,
          {
            id: `user-${messageId}`,
            role: 'user',
            content,
            timestamp: Date.now(),
            userId,
          },
          {
            id: messageId,
            role: 'assistant',
            content: fullResponse,
            timestamp: Date.now(),
            userId,
          },
        ];
        await dossierManager.saveMessages(userId, sessionId, sessionMessages);
      }
    }
  } catch (err: any) {
    console.error('[Agent] Error:', err);
    const payload: ErrorPayload = { text: `Agent error: ${err.message || err}` };
    ws.send(JSON.stringify({ type: 'error', payload }));
  } finally {
    activeStreams.delete(ws);
  }
}

/**
 * Handle summer program recommendation — streams personalized program matches.
 */
async function handleSummerRecommend(
  ws: WebSocket,
  opts: {
    userId?: string;
    profile?: StudentProfile;
    interests?: string[];
    budget?: number;
    application_status?: string;
    model?: string;
  },
): Promise<void> {
  const messageId = `summer_${Date.now()}`;
  const { userId, profile, interests, budget, application_status, model } = opts;

  ws.send(JSON.stringify({ type: 'summer_recommend_start', payload: { messageId } }));

  try {
    // Lazy-import SummerProgramManager to avoid circular deps
    const { SummerProgramManager } = await import('./knowledge/summerProgramManager.js');
    const SPM_ROOT = path.resolve(process.cwd(), '../data/summer-programs');
    const USERS_ROOT = path.resolve(process.cwd(), '../data/users');
    const spm = new SummerProgramManager(SPM_ROOT, USERS_ROOT);

    const programs = spm.listPrograms();

    // Build a summary of each program for the LLM
    const programSummaries = programs.map(p =>
      `[${p.id}] ${p.name} | ${p.discipline.join(', ')} | ${p.selectivity} | $${p.cost.amount} | deadline: ${p.deadline} | signal: ${p.admissions_signal}`
    ).join('\n');

    // Parse applied/rejected from application_status string
    const applied: string[] = [];
    const rejected: string[] = [];
    if (application_status) {
      try {
        const parsed = JSON.parse(application_status);
        for (const [pid, status] of Object.entries(parsed)) {
          if (status === 'applied' || status === 'waitlisted') applied.push(pid);
          if (status === 'rejected' || status === 'declined') rejected.push(pid);
        }
      } catch (_) {}
    }

    const studentProfile = {
      interests: interests || profile?.interests?.split(',').map((s: string) => s.trim()).filter(Boolean) || [],
      budget: budget ?? (profile?.budget ? parseInt(profile.budget) : undefined),
      applied_programs: applied,
      rejected_programs: rejected,
      grade_level: profile?.intended_majors ? undefined : undefined, // not available in profile
      academic_strength: profile?.gpa || profile?.sat_score || undefined,
    };

    const recommendStream = await createSummerRecommendStream(programSummaries, studentProfile, model);
    activeStreams.set(ws, { abort: () => recommendStream.abort() });

    let fullResponse = '';

    for await (const message of recommendStream) {
      if (ws.readyState !== WebSocket.OPEN) break;
      if (message.text) {
        fullResponse += message.text;
        ws.send(JSON.stringify({
          type: 'summer_recommend_delta',
          payload: { text: message.text, done: false, messageId },
        }));
      }
    }

    ws.send(JSON.stringify({
      type: 'summer_recommend_delta',
      payload: { text: '', done: true, messageId },
    }));

    // If user is logged in, save recommendation context to dossier
    if (userId && fullResponse) {
      const summary = fullResponse.substring(0, 500).replace(/\n/g, ' ').trim();
      dossierManager.appendConversation(userId, 'Summer program recommendations', summary).catch(err => {
        console.error('[SummerRecommend] Dossier append failed:', err?.message || err);
      });
    }

  } catch (err: any) {
    console.error('[SummerRecommend] Error:', err);
    ws.send(JSON.stringify({
      type: 'summer_recommend_error',
      payload: { text: err.message || 'Recommendation failed' },
    }));
  } finally {
    activeStreams.delete(ws);
  }
}

ensureRetriever().catch(console.error);

/**
 * Handle essay review — streams structured feedback back to client.
 * Saves review to disk when stream completes.
 */
async function handleEssayReview(
  ws: WebSocket,
  opts: {
    essayId: string;
    essayText: string;
    promptId: string;
    promptLabel: string;
    promptText: string;
    wordLimit: string;
    tips: string[];
    pitfalls: string[];
    userId?: string;
    model?: string;
  },
): Promise<void> {
  const messageId = `review_${Date.now()}`;
  const { essayId, essayText, promptId, promptLabel, promptText, wordLimit, tips, pitfalls, userId, model } = opts;

  ws.send(JSON.stringify({ type: 'review_start', payload: { messageId, essayId } }));

  try {
    await ensureRetriever();

    // Build the essay review prompt
    const tipsBlock = tips.length ? `\n**Prompt Tips:**\n${tips.map(t => `- ${t}`).join('\n')}` : '';
    const pitfallsBlock = pitfalls.length ? `\n**Common Pitfalls to Avoid:**\n${pitfalls.map(p => `- ${p}`).join('\n')}` : '';

    const reviewSystemPrompt = `You are a professional US college admissions essay reviewer. Provide rigorous, specific, and actionable feedback on student essays.

## Review Framework
For every essay you review, structure your feedback as follows:

### 1. Overall Assessment
Give a 2-3 sentence verdict: what's working, what needs work, and whether the essay answers the prompt effectively.

### 2. Strengths
List 3-5 specific things the essay does well (with exact quotes/examples from the essay).

### 3. Areas for Improvement
For each issue, state: the problem, the specific passage (quoted), and a concrete revision suggestion.

### 4. Prompt Alignment
Assess whether the essay directly and compellingly answers the prompt. If off-target, explain why and how to realign.

### 5. Voice & Authenticity
Comment on whether the essay sounds like a real teenager or like a polished adult performing "essay voice."

### 6. Structural Feedback
If the essay has structural issues (weak hook, muddled middle, abrupt ending), point them out with specific suggestions.

### 7. Revision Priorities
List the top 3 changes the student should make before the next draft.

## Style Rules
- Be direct and specific. Quote the essay text when critiquing.
- Avoid generic praise ("Great essay!"). Get granular ("Your opening line works because...").
- Push for authenticity and specificity. "Show, don't tell" is not optional advice.
- Do NOT rewrite the essay. Guide the writer to revise themselves.
- Use markdown formatting for clarity.`;

    const userContent = [
      `## Essay Under Review`,
      `**Prompt:** [${promptLabel}] ${promptText}`,
      `**Word Limit:** ${wordLimit}`,
      tipsBlock,
      pitfallsBlock,
      `**Student Essay:**`,
      essayText,
    ].join('\n\n');

    // Use essay review stream — dedicated prompt, no KB/web search
    const agentStream = await createEssayReviewStream(userContent, model);

    activeStreams.set(ws, { abort: () => agentStream.abort() });

    let fullResponse = '';

    for await (const message of agentStream) {
      if (ws.readyState !== WebSocket.OPEN) break;
      if (message.text) {
        fullResponse += message.text;
        ws.send(JSON.stringify({
          type: 'review_delta',
          payload: { text: message.text, done: false, messageId, essayId },
        }));
      }
    }

    ws.send(JSON.stringify({
      type: 'review_delta',
      payload: { text: '', done: true, messageId, essayId },
    }));

    // Save review to disk
    if (userId) {
      try {
        const { EssayManager } = await import('./knowledge/essayManager.js');
        const em = new EssayManager(path.resolve(process.cwd(), '../data/users'));
        const review = {
          id: `review_${Date.now()}`,
          essayId,
          content: fullResponse,
          completedAt: Date.now(),
        };
        em.saveReview(review);
        console.log(`[EssayReview] Saved review for ${essayId}`);
      } catch (err: any) {
        console.error('[EssayReview] Failed to save review:', err?.message || err);
      }
    }

  } catch (err: any) {
    console.error('[EssayReview] Error:', err);
    ws.send(JSON.stringify({
      type: 'review_error',
      payload: { text: err.message || 'Review failed', essayId },
    }));
  } finally {
    activeStreams.delete(ws);
  }
}

server.listen(PORT, () => {
  console.log(`
========================================
  College Advisor Agent - Backend
  LLM : ${process.env.LLM_MODEL || 'deepseek-v4-flash'}
  WS  : ws://localhost:${PORT}
  Health: http://localhost:${PORT}/health
========================================
  `);
});
