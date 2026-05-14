import { Router } from 'express';
import { SummerProgramManager } from '../knowledge/summerProgramManager.js';
import path from 'path';
import { authMiddleware } from '../auth/auth.js';

const router = Router();

const SPM_ROOT = path.resolve(process.cwd(), './data/summer-programs');
const USERS_ROOT = path.resolve(process.cwd(), './data/users');
const spm = new SummerProgramManager(SPM_ROOT, USERS_ROOT);

// GET /api/summer-programs/stats
router.get('/stats', (_req, res) => {
  try {
    const stats = spm.getKBStats();
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/summer-programs
router.get('/', (req, res) => {
  try {
    const { q, discipline, max_cost, selectivity } = req.query;

    let programs = spm.listPrograms();

    if (typeof q === 'string' && q) {
      programs = spm.searchPrograms(q);
    }
    if (typeof discipline === 'string' && discipline) {
      programs = programs.filter(p =>
        p.discipline.includes(discipline) || p.tags.includes(discipline)
      );
    }
    if (typeof max_cost === 'string' && max_cost !== '') {
      const max = parseInt(max_cost);
      if (!isNaN(max)) {
        programs = programs.filter(p =>
          max === 0 ? p.cost.amount === 0 : p.cost.amount <= max
        );
      }
    }
    if (typeof selectivity === 'string' && selectivity) {
      const levels = ['moderately-selective', 'competitive', 'very-competitive', 'extremely-competitive'];
      const idx = levels.indexOf(selectivity);
      if (idx >= 0) {
        programs = programs.filter(p => levels.indexOf(p.selectivity) <= idx);
      }
    }

    res.json({ programs, total: programs.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/summer-programs/:id
router.get('/:id', (req, res) => {
  try {
    const program = spm.getProgram(req.params.id);
    if (!program) return res.status(404).json({ error: 'Program not found' });
    res.json({ program });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/summer-programs/user/:userId/applications
router.get('/user/:userId/applications', authMiddleware, (req, res) => {
  const userId = req.auth.userId;
  try {
    const applications = spm.listApplications(userId);
    // Enrich with program data
    const enriched = applications.map(app => {
      const program = spm.getProgram(app.programId);
      return { ...app, program };
    });
    res.json({ applications: enriched });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/summer-programs/user/:userId/applications
// Body: { programId, notes?, deadline_reminder? }
router.post('/user/:userId/applications', authMiddleware, (req, res) => {
  const userId = req.auth.userId;
  try {
    const { programId, notes = '', deadline_reminder = false } = req.body as {
      programId: string;
      notes?: string;
      deadline_reminder?: boolean;
    };

    if (!programId) return res.status(400).json({ error: 'programId is required' });

    const program = spm.getProgram(programId);
    if (!program) return res.status(404).json({ error: 'Program not found in KB' });

    const existing = spm.getApplication(userId, programId);
    if (existing) return res.status(409).json({ error: 'Application already exists', application: existing });

    const app = {
      programId,
      status: 'researching' as const,
      notes,
      deadline_reminder,
    };
    spm.saveApplication(userId, app);
    res.status(201).json({ application: { ...app, program } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/summer-programs/user/:userId/applications/:programId
// Body: { status?, notes?, deadline_reminder? }
router.patch('/user/:userId/applications/:programId', authMiddleware, (req, res) => {
  const { userId, programId } = req.params;
  try {
    const { status, notes, deadline_reminder } = req.body as {
      status?: string;
      notes?: string;
      deadline_reminder?: boolean;
    };

    const existing = spm.getApplication(userId, programId);
    if (!existing) return res.status(404).json({ error: 'Application not found' });

    if (status) {
      const validStatuses = ['researching', 'preparing', 'applied', 'waitlisted', 'accepted', 'declined', 'rejected'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
      }
      existing.status = status as any;
      if (status === 'applied') existing.applied_at = Date.now();
      if (['accepted', 'rejected', 'waitlisted'].includes(status)) {
        existing.decision_received_at = Date.now();
        existing.decision_status = status;
      }
    }
    if (notes !== undefined) existing.notes = notes;
    if (deadline_reminder !== undefined) existing.deadline_reminder = deadline_reminder;

    spm.saveApplication(userId, existing);
    const program = spm.getProgram(programId);
    res.json({ application: { ...existing, program } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/summer-programs/user/:userId/applications/:programId
router.delete('/user/:userId/applications/:programId', authMiddleware, (req, res) => {
  const { userId, programId } = req.params;
  try {
    spm.removeApplication(userId, programId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/summer-programs/user/:userId/followthru
router.get('/user/:userId/followthru', authMiddleware, (req, res) => {
  const userId = req.auth.userId;
  try {
    const sessions = spm.listFollowThru(userId);
    // Enrich with program data
    const enriched = sessions.map(s => {
      const program = spm.getProgram(s.programId);
      return { ...s, program };
    });
    res.json({ sessions: enriched });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/summer-programs/user/:userId/followthru/:programId
// Body: { goals: string[] }
router.post('/user/:userId/followthru/:programId', authMiddleware, (req, res) => {
  const { userId, programId } = req.params;
  try {
    const { goals = [] } = req.body as { goals: string[] };

    const program = spm.getProgram(programId);
    if (!program) return res.status(404).json({ error: 'Program not found' });

    const existing = spm.getFollowThru(userId, programId);
    if (existing) return res.status(409).json({ error: 'Follow-thru already exists', session: existing });

    const session = spm.createFollowThru(userId, programId, goals);
    res.status(201).json({ session: { ...session, program } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/summer-programs/user/:userId/followthru/:programId/reflection
// Body: ReflectionEntry
router.post('/user/:userId/followthru/:programId/reflection', authMiddleware, (req, res) => {
  const { userId, programId } = req.params;
  try {
    const entry = req.body;
    spm.addReflection(userId, programId, entry);
    const session = spm.getFollowThru(userId, programId);
    const program = spm.getProgram(programId);
    res.json({ session: { ...session, program } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/summer-programs/user/:userId/followthru/:programId/phase
// Body: { phase: FollowThruPhase }
router.patch('/user/:userId/followthru/:programId/phase', authMiddleware, (req, res) => {
  const { userId, programId } = req.params;
  try {
    const { phase } = req.body;
    spm.updatePhase(userId, programId, phase);
    const session = spm.getFollowThru(userId, programId);
    const program = spm.getProgram(programId);
    res.json({ session: { ...session, program } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/summer-programs/user/:userId/followthru/:programId/recap
// Body: CollegeRecapEntry
router.post('/user/:userId/followthru/:programId/recap', authMiddleware, (req, res) => {
  const { userId, programId } = req.params;
  try {
    const recap = req.body;
    spm.saveCollegeRecap(userId, programId, recap);
    const session = spm.getFollowThru(userId, programId);
    const program = spm.getProgram(programId);
    res.json({ session: { ...session, program } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
