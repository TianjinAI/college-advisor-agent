import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { createAgentStream } from './agent';
import type { SendMessagePayload, TextDeltaPayload, ErrorPayload, StudentProfile } from './types';

// Load env
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;
const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'college-advisor-agent' });
});

const server = createServer(app);
const wss = new WebSocketServer({ server });

// Store active streams for abort
const activeStreams = new Map<WebSocket, { abort(): Promise<void> }>();

wss.on('connection', (ws) => {
  console.log(`[WS] Client connected. Total: ${wss.clients.size}`);

  ws.on('message', async (raw) => {
    try {
      const msg = JSON.parse(raw.toString()) as { type: string; payload: unknown };
      console.log(`[WS] Received: ${msg.type}`);

      switch (msg.type) {
        case 'send_message': {
          const { content, profile } = msg.payload as SendMessagePayload;
          await handleAgentQuery(ws, content, profile);
          break;
        }
        case 'abort': {
          const stream = activeStreams.get(ws);
          if (stream) await stream.abort();
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
  });
});

/**
 * Handle Agent query with streaming response
 */
async function handleAgentQuery(
  ws: WebSocket,
  content: string,
  profile?: StudentProfile,
): Promise<void> {
  const messageId = `msg_${Date.now()}`;

  // Send start marker
  ws.send(JSON.stringify({
    type: 'text_start',
    payload: { messageId },
  }));

  try {
    const agentStream = await createAgentStream(content, profile);
    activeStreams.set(ws, { abort: () => agentStream.abort() });

    let hasText = false;

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
    }
  } catch (err: any) {
    console.error('[Agent] Error:', err);
    const payload: ErrorPayload = { text: `Agent error: ${err.message || err}` };
    ws.send(JSON.stringify({ type: 'error', payload }));
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
