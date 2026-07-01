import { Router } from 'express';
import { dossierManager } from '../agent.js';
import type { SessionChatMessage, TargetSchool } from '../types.js';
import type { StudentProfile } from '../types.js';
import { authMiddleware } from '../auth/auth.js';

const router = Router();

router.get('/api/sessions', authMiddleware, async (req, res) => {
  const userId = req.auth!.userId;
  if (!userId) {
    res.status(400).json({ error: 'userId is required' });
    return;
  }

  try {
    const sessions = await dossierManager.listSessions(userId);
    res.json({ sessions });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to list sessions' });
  }
});

router.post('/api/sessions', authMiddleware, async (req, res) => {
  const { name, purpose } = req.body as { name?: string; purpose?: string };
  const userId = req.auth!.userId;
  if (!name?.trim()) {
    res.status(400).json({ error: 'name is required' });
    return;
  }

  try {
    const session = await dossierManager.createSession(userId, name, purpose);
    res.status(201).json({ session });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to create session' });
  }
});

router.get('/api/sessions/:id/messages', authMiddleware, async (req, res) => {
  const userId = req.auth!.userId;
  try {
    const messages = await dossierManager.loadMessages(userId, req.params.id);
    res.json({ messages });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to load messages' });
  }
});

router.post('/api/sessions/:id/messages', authMiddleware, async (req, res) => {
  const { messages } = req.body as { messages?: SessionChatMessage[] };
  const userId = req.auth!.userId;
  if (!Array.isArray(messages)) {
    res.status(400).json({ error: 'messages is required' });
    return;
  }

  try {
    const saved = await dossierManager.saveMessages(userId, req.params.id, messages);
    res.json({ messages: saved });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to save messages' });
  }
});

// ─── User profile routes ────────────────────────────────────────────────

router.get('/api/user/profile', authMiddleware, async (req, res) => {
  const userId = req.auth!.userId;

  try {
    const [displayName, studentProfile] = await Promise.all([
      dossierManager.getDisplayName(userId),
      dossierManager.getStudentProfile(userId),
    ]);
    res.json({ userId, displayName, studentProfile });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to load profile' });
  }
});

router.put('/api/user/profile', authMiddleware, async (req, res) => {
  const { displayName, studentProfile } = req.body as {
    displayName?: string;
    studentProfile?: StudentProfile;
  };
  const userId = req.auth!.userId;

  if (!displayName?.trim() && !studentProfile) {
    res.status(400).json({ error: 'At least one profile field is required' });
    return;
  }

  try {
    if (displayName?.trim()) {
      await dossierManager.setDisplayName(userId, displayName.trim());
    }
    if (studentProfile) {
      await dossierManager.setStudentProfile(userId, studentProfile);
    }
    const [savedDisplayName, savedStudentProfile] = await Promise.all([
      dossierManager.getDisplayName(userId),
      dossierManager.getStudentProfile(userId),
    ]);
    res.json({ userId, displayName: savedDisplayName, studentProfile: savedStudentProfile });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to save profile' });
  }
});

router.get('/api/user/college-list', authMiddleware, async (req, res) => {
  const userId = req.auth!.userId;
  try {
    const list = await dossierManager.getCollegeList(userId);
    res.json(list);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Accept expanded p2-4 payload: { targetSchools, locked, lockedAt, updatedAt }
// Backward compatible: old clients send only { targetSchools }
router.put('/api/user/college-list', authMiddleware, async (req, res) => {
  const userId = req.auth!.userId;
  const { targetSchools, locked, lockedAt } = req.body as {
    targetSchools?: TargetSchool[];
    locked?: boolean;
    lockedAt?: number;
  };
  try {
    await dossierManager.saveCollegeList(userId, {
      targetSchools: targetSchools ?? [],
      locked: locked ?? false,
      // Treat lockedAt: 0 (sent on unlock) as intentional clear
      lockedAt: lockedAt === 0 ? undefined : (locked ? (lockedAt ?? Date.now()) : undefined),
      updatedAt: Date.now(),
    });
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Dossier enrichment ────────────────────────────────────────────────────

router.post('/api/user/dossier/enrich', authMiddleware, async (req, res) => {
  const userId = req.auth!.userId;
  const { content, programName, section } = req.body as {
    content?: string;
    programName?: string;
    section?: string;
  };

  if (!content?.trim()) {
    res.status(400).json({ error: 'content is required' });
    return;
  }

  try {
    await dossierManager.enrichDossier(userId, content.trim(), programName, section);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;