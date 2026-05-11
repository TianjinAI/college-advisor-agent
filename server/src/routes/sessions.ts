import { Router } from 'express';
import { dossierManager } from '../agent.js';
import type { SessionChatMessage } from '../types.js';

const router = Router();

router.get('/api/sessions', async (req, res) => {
  const userId = typeof req.query.userId === 'string' ? req.query.userId : '';
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

router.post('/api/sessions', async (req, res) => {
  const { userId, name, purpose } = req.body as { userId?: string; name?: string; purpose?: string };
  if (!userId || !name?.trim()) {
    res.status(400).json({ error: 'userId and name are required' });
    return;
  }

  try {
    const session = await dossierManager.createSession(userId, name, purpose);
    res.status(201).json({ session });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to create session' });
  }
});

router.get('/api/sessions/:id/messages', async (req, res) => {
  const userId = typeof req.query.userId === 'string' ? req.query.userId : '';
  if (!userId) {
    res.status(400).json({ error: 'userId is required' });
    return;
  }

  try {
    const messages = await dossierManager.loadMessages(userId, req.params.id);
    res.json({ messages });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to load messages' });
  }
});

router.post('/api/sessions/:id/messages', async (req, res) => {
  const { userId, messages } = req.body as { userId?: string; messages?: SessionChatMessage[] };
  if (!userId || !Array.isArray(messages)) {
    res.status(400).json({ error: 'userId and messages are required' });
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

router.get('/api/user/profile', async (req, res) => {
  const userId = typeof req.query.userId === 'string' ? req.query.userId : '';
  if (!userId) {
    res.status(400).json({ error: 'userId is required' });
    return;
  }

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

router.put('/api/user/profile', async (req, res) => {
  const { userId, displayName, studentProfile } = req.body as {
    userId?: string;
    displayName?: string;
    studentProfile?: import('../types.js').StudentProfile;
  };

  if (!userId || (!displayName?.trim() && !studentProfile)) {
    res.status(400).json({ error: 'userId and at least one profile field are required' });
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
