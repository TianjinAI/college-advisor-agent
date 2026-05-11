import { Router } from 'express';
import retriever from '../knowledge/retriever.js';
import { EssayManager } from '../knowledge/essayManager.js';
import path from 'path';

const router = Router();

const essayManager = new EssayManager(path.resolve(process.cwd(), '../data/users'));

/**
 * GET /api/essays/prompts
 * Return all essay prompts, optionally filtered by category.
 * Query: ?category=common-app
 */
router.get('/prompts', (req, res) => {
  try {
    const { category } = req.query;
    const prompts = (retriever as any).essays?.map((e: any) => e.prompt) || [];
    const filtered = category
      ? prompts.filter((p: any) => p.category === category)
      : prompts;
    res.json({ prompts: filtered, total: filtered.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/essays/patterns
 * Return all essay patterns, optionally filtered by type.
 * Query: ?type=narrative-arc
 */
router.get('/patterns', (req, res) => {
  try {
    const { type } = req.query;
    const patterns = (retriever as any).patterns?.map((p: any) => p.pattern) || [];
    const filtered = type
      ? patterns.filter((p: any) => p.type === type)
      : patterns;
    res.json({ patterns: filtered, total: filtered.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/essays/search
 * Search across both prompts and patterns.
 * Query: ?q=identity
 */
router.get('/search', (req, res) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q : '';
    if (!q) {
      return res.json({ prompts: [], patterns: [] });
    }
    const essayResults = (retriever as any).searchEssays?.(q, 3) || [];
    const patternResults = (retriever as any).searchPatterns?.(q, 3) || [];
    res.json({
      prompts: essayResults.map((r: any) => r.prompt),
      patterns: patternResults.map((r: any) => r.pattern),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/essays/stats
 * Return KB stats (counts).
 */
router.get('/stats', (_req, res) => {
  try {
    const stats = retriever.getStats();
    res.json({
      promptCount: stats.essayPromptCount,
      patternCount: stats.essayPatternCount,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/essays/user/:userId
 * List all essays for a user.
 */
router.get('/user/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const essays = essayManager.listEssays(userId);
    res.json({ essays, total: essays.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/essays/user/:userId/:essayId
 * Get a single essay with its review.
 */
router.get('/user/:userId/:essayId', (req, res) => {
  try {
    const { userId, essayId } = req.params;
    const entry = essayManager.getEntry(essayId, userId);
    if (!entry) return res.status(404).json({ error: 'Essay not found' });
    res.json({ essay: entry });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/essays/user/:userId
 * Submit a new essay for review. Body: { promptId, promptLabel, draftText, revisionOf? }
 */
router.post('/user/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const { promptId, promptLabel, draftText, revisionOf } = req.body as {
      promptId: string;
      promptLabel: string;
      draftText: string;
      revisionOf?: string;
    };

    if (!promptId || !promptLabel || !draftText) {
      return res.status(400).json({ error: 'promptId, promptLabel, and draftText are required' });
    }

    const wordCount = draftText.trim().split(/\s+/).filter(Boolean).length;
    const essay = {
      id: `essay_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      userId,
      promptId,
      promptLabel,
      draftText,
      wordCount,
      submittedAt: Date.now(),
      revisionOf,
    };

    essayManager.saveEssay(essay);
    res.status(201).json({ essay });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
