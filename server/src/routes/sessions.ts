import { Router } from 'express';
import { dossierManager } from '../agent.js';
import type { SessionChatMessage } from '../types.js';
import { authMiddleware } from '../auth/auth.js';

const router = Router();

router.get('/api/sessions', authMiddleware, async (req, res) => {
  const userId = req.auth.userId;
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
  const userId = req.auth.userId;
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
  const userId = req.auth.userId;
  try {
    const messages = await dossierManager.loadMessages(userId, req.params.id);
    res.json({ messages });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to load messages' });
  }
});

router.post('/api/sessions/:id/messages', authMiddleware, async (req, res) => {
  const { messages } = req.body as { messages?: SessionChatMessage[] };
  const userId = req.auth.userId;
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

export default router;

// ─── User profile routes ────────────────────────────────────────────────

router.get('/api/user/profile', authMiddleware, async (req, res) => {
  const userId = req.auth.userId;

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
    studentProfile?: import('../types.js').StudentProfile;
  };
  const userId = req.auth.userId;

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
