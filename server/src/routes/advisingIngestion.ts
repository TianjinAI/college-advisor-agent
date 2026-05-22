import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import OpenAI from 'openai';
import { AdvisingIngestionManager } from '../knowledge/advisingIngestionManager.js';
import retriever from '../knowledge/retriever.js';
import faRetriever from '../knowledge/faRetriever.js';

const router = Router();

const ENTRIES_ROOT = path.resolve(process.cwd(), './data/advising-ingestion/entries');
const SOURCES_ROOT = path.resolve(process.cwd(), './data/advising-ingestion/sources');
const manager = new AdvisingIngestionManager(ENTRIES_ROOT);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const llm = new OpenAI({
  baseURL: process.env.LLM_BASE_URL || 'https://opencode.ai/zen/go/v1',
  apiKey: process.env.LLM_API_KEY || '',
});

function saveSource(label: string, text: string): string {
  fs.mkdirSync(SOURCES_ROOT, { recursive: true });
  const safe = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 56) || 'source';
  const file = `${Date.now()}-${safe}.txt`;
  const fullPath = path.join(SOURCES_ROOT, file);
  fs.writeFileSync(fullPath, text, 'utf-8');
  return fullPath;
}

function titleFromText(text: string, fallback: string): string {
  const first = text.split(/\r?\n/).map(s => s.trim()).find(Boolean) || fallback;
  return first.replace(/^#+\s*/, '').slice(0, 90) || fallback;
}

function candidateQuery(candidate: any): string {
  return [candidate.topic, candidate.problem, candidate.reasoning, ...(candidate.advice_given || []), ...(candidate.action_plan || [])].join(' ');
}

async function collectCoreKbEvidence(candidate: any) {
  const dataDir = path.resolve(process.cwd(), './data');
  await retriever.load(dataDir);
  await faRetriever.load(dataDir);
  const query = candidateQuery(candidate);
  const core = retriever.searchCoreKnowledge(query, 8);
  const fa = faRetriever.search(query);
  return fa ? [...core, { source_type: 'core_financial_aid_kb', title: 'Financial Aid KB search result', content: fa.slice(0, 2400), score: 1, matchedOn: ['faRetriever'] }] : core;
}

async function analyzeConflict(candidate: any, conflicts: Array<{ entry: any; score: number; reason: string }>, coreEvidence: any[] = []) {
  if (!conflicts.length && !coreEvidence.length) return { relationship: 'complementary', recommendation: 'safe_to_add', rationale: 'No similar indexed entries or core KB items found.', context_conditions: [] };
  const prompt = `You are strict knowledge QA for college advising.
Decide relationship between NEW entry, EXISTING indexed external entries, and CORE KB evidence.
Core KB has higher default authority unless new source is clearly more specific, newer, or context-limited.
Output JSON only with keys:
relationship: complementary|overlap|tension|contradiction
recommendation: safe_to_add|add_with_note|keep_both|replace|flag_for_review|block
rationale: string
context_conditions: string[]

NEW ENTRY:\n${JSON.stringify(candidate)}\n
EXISTING INDEXED EXTERNAL ENTRIES:\n${JSON.stringify(conflicts.map(c => c.entry))}\n\nCORE KB EVIDENCE:\n${JSON.stringify(coreEvidence)}`;

  try {
    const resp = await llm.chat.completions.create({
      model: process.env.LLM_MODEL || 'deepseek-v4-flash',
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: prompt }],
    });
    return JSON.parse(resp.choices?.[0]?.message?.content || '{}');
  } catch (err: any) {
    return {
      relationship: coreEvidence.length ? 'overlap' : 'tension',
      recommendation: coreEvidence.length ? 'flag_for_review' : 'add_with_note',
      rationale: `LLM conflict analysis unavailable (${err?.status || 'error'}). Found ${coreEvidence.length} related core KB item(s) and ${conflicts.length} indexed external note(s); require human review before trusting as new guidance.`,
      context_conditions: coreEvidence.slice(0, 3).map((x: any) => `Compare against core KB: ${x.title}`),
    };
  }
}

// GET /api/advising-ingestion/stats
router.get('/stats', (_req, res) => {
  try {
    res.json(manager.getStats());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/advising-ingestion/reload
router.post('/reload', (_req, res) => {
  try {
    manager.reload();
    res.json({ ok: true, stats: manager.getStats() });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/advising-ingestion/import/text
router.post('/import/text', (req, res) => {
  try {
    const text = String(req.body?.text || '').trim();
    if (text.length < 20) return res.status(400).json({ error: 'Text is too short to ingest.' });
    const topic = String(req.body?.topic || titleFromText(text, 'Pasted advising source'));
    saveSource(topic, text);
    const entry = manager.createDraft({ topic, text, sourceUrl: 'manual_input', sourceType: 'direct_observation', creator: 'text_input' });
    res.json({ ok: true, entry, conflicts: manager.findPotentialConflicts(entry), stats: manager.getStats() });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/advising-ingestion/import/url
router.post('/import/url', async (req, res) => {
  try {
    const url = String(req.body?.url || '').trim();
    if (!/^https?:\/\//i.test(url)) return res.status(400).json({ error: 'Valid http(s) URL required.' });
    const r = await fetch(url, { headers: { 'User-Agent': 'CollegeAdvisorBot/1.0' } });
    if (!r.ok) return res.status(400).json({ error: `URL fetch failed: ${r.status}` });
    const html = await r.text();
    const text = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (text.length < 100) return res.status(400).json({ error: 'Fetched page had too little readable text.' });
    const topic = String(req.body?.topic || titleFromText(text, new URL(url).hostname));
    saveSource(topic, text);
    const entry = manager.createDraft({ topic, text, sourceUrl: url, sourceType: 'web_article', creator: 'url_import' });
    res.json({ ok: true, entry, conflicts: manager.findPotentialConflicts(entry), stats: manager.getStats() });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/advising-ingestion/import/file
router.post('/import/file', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'File required.' });
    const name = req.file.originalname || 'uploaded-source.txt';
    const ext = path.extname(name).toLowerCase();
    if (!['.txt', '.md', '.csv', '.json'].includes(ext)) {
      return res.status(400).json({ error: 'For now upload .txt, .md, .csv, or .json. PDF/DOCX extraction comes next.' });
    }
    const text = req.file.buffer.toString('utf-8').trim();
    if (text.length < 20) return res.status(400).json({ error: 'File text is too short to ingest.' });
    saveSource(name, text);
    const topic = String(req.body?.topic || titleFromText(text, name));
    const entry = manager.createDraft({ topic, text, sourceUrl: `uploaded_file:${name}`, sourceType: 'direct_observation', creator: 'file_upload' });
    res.json({ ok: true, entry, conflicts: manager.findPotentialConflicts(entry), stats: manager.getStats() });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/advising-ingestion/:id/conflicts
router.get('/:id/conflicts', (req, res) => {
  try {
    const entry = manager.get(req.params.id);
    if (!entry) return res.status(404).json({ error: 'Entry not found' });
    res.json({ conflicts: manager.findPotentialConflicts(entry) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/advising-ingestion/:id/analyze-conflicts
router.post('/:id/analyze-conflicts', async (req, res) => {
  try {
    const entry = manager.get(req.params.id);
    if (!entry) return res.status(404).json({ error: 'Entry not found' });
    const conflicts = manager.findPotentialConflicts(entry);
    const coreEvidence = await collectCoreKbEvidence(entry);
    const analysis = await analyzeConflict(entry, conflicts, coreEvidence);
    res.json({ analysis, conflicts, coreEvidence });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/advising-ingestion/:id/approve
router.post('/:id/approve', async (req, res) => {
  try {
    const entry = manager.get(req.params.id);
    if (!entry) return res.status(404).json({ error: 'Entry not found' });
    const conflicts = manager.findPotentialConflicts(entry);
    const coreEvidence = await collectCoreKbEvidence(entry);
    const analysis = await analyzeConflict(entry, conflicts, coreEvidence);
    const approvedBy = typeof req.body?.approvedBy === 'string' ? req.body.approvedBy : 'shaobin';
    const targets = Array.isArray(req.body?.targets) ? req.body.targets : ['college_advisor', 'financial_aid'];
    const updated = manager.approveAndIndex(req.params.id, approvedBy, targets);
    res.json({ ok: true, entry: updated, analysis, conflicts, coreEvidence, stats: manager.getStats() });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/advising-ingestion/:id/status
router.patch('/:id/status', (req, res) => {
  try {
    const status = req.body?.status;
    if (!['draft', 'needs_review', 'approved', 'indexed', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    const entry = manager.updateStatus(req.params.id, status, req.body?.notes);
    if (!entry) return res.status(404).json({ error: 'Entry not found' });
    res.json({ ok: true, entry, stats: manager.getStats() });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/advising-ingestion?q=essay&limit=10
router.get('/', (req, res) => {
  try {
    const { q, limit } = req.query;

    if (typeof q === 'string' && q.trim()) {
      const n = typeof limit === 'string' ? parseInt(limit, 10) : 10;
      const results = manager.search(q.trim(), Number.isFinite(n) ? n : 10);
      return res.json({ results, total: results.length, query: q });
    }

    const entries = manager.list();
    res.json({ entries, total: entries.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/advising-ingestion/:id
router.get('/:id', (req, res) => {
  try {
    const entry = manager.get(req.params.id);
    if (!entry) return res.status(404).json({ error: 'Entry not found' });
    res.json(entry);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
