import { Router } from 'express';
import { createSummerNarrativeSuggestStream } from '../agent.js';
import { SummerProgramManager } from '../knowledge/summerProgramManager.js';
import { DossierManager } from '../knowledge/dossier.js';

interface NarrativeSuggestionJson {
  essay_angles: string[];
  interview_points: string[];
  narrative_blurb: string;
}
import path from 'path';
import { authMiddleware } from '../auth/auth.js';

const router = Router();

const SPM_ROOT = path.resolve(process.cwd(), './data/summer-programs');
const USERS_ROOT = path.resolve(process.cwd(), './data/users');
const spm = new SummerProgramManager(SPM_ROOT, USERS_ROOT);
const dossierManager = new DossierManager(path.resolve(process.cwd(), '../data/users'));

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
  const userId = req.auth!.userId;
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
  const userId = req.auth!.userId;
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
// Body: { status?, notes?, deadline_reminder?, enrollment_decision?, deposit_deadline?, deposit_paid? }
router.patch('/user/:userId/applications/:programId', authMiddleware, (req, res) => {
  const authUserId = req.auth!.userId;
  const { programId } = req.params;
  try {
    const { status, notes, deadline_reminder, enrollment_decision, deposit_deadline, deposit_paid } = req.body as {
      status?: string;
      notes?: string;
      deadline_reminder?: boolean;
      enrollment_decision?: string;
      deposit_deadline?: string;
      deposit_paid?: boolean;
    };

    const existing = spm.getApplication(authUserId, programId);
    if (!existing) return res.status(404).json({ error: 'Application not found' });

    if (status) {
      const validStatuses = ['researching', 'preparing', 'applied', 'waitlisted', 'accepted', 'declined', 'rejected', 'enrollment_decision'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
      }
      existing.status = status as any;
      if (status === 'applied') existing.applied_at = Date.now();
      if (['accepted', 'rejected', 'waitlisted'].includes(status)) {
        existing.decision_received_at = Date.now();
        existing.decision_status = status;
      }
      // Auto-create follow-thru session when accepted
      if (status === 'accepted') {
        const existingFt = spm.getFollowThru(authUserId, programId);
        if (!existingFt) {
          const program = spm.getProgram(programId);
          spm.createFollowThru(authUserId, programId, [], program || undefined);
        }
      }
    }
    if (notes !== undefined) existing.notes = notes;
    if (deadline_reminder !== undefined) existing.deadline_reminder = deadline_reminder;

    // Handle enrollment decision fields (from EnrollmentDecisionForm)
    if (enrollment_decision !== undefined) {
      const validDecisions = ['enrolled', 'declined_enrollment', 'pending', 'attending', 'declined'];
      if (!validDecisions.includes(enrollment_decision)) {
        return res.status(400).json({ error: `Invalid enrollment_decision. Must be one of: ${validDecisions.join(', ')}` });
      }
      // Normalize 'attending' → 'enrolled', 'declined' → 'declined_enrollment'
      const normalized = enrollment_decision === 'attending' ? 'enrolled'
        : enrollment_decision === 'declined' ? 'declined_enrollment'
        : enrollment_decision as import('../knowledge/summerProgramManager.js').EnrollmentDecision;
      existing.enrollment_decision = normalized;
      existing.enrollment_decision_date = Date.now();
      if (normalized === 'enrolled') existing.status = 'enrollment_decision';
      if (normalized === 'declined_enrollment') existing.status = 'declined';
    }
    if (deposit_deadline !== undefined) existing.deposit_deadline = deposit_deadline;
    if (deposit_paid !== undefined) existing.deposit_paid = deposit_paid;

    spm.saveApplication(authUserId, existing);
    const program = spm.getProgram(programId);
    res.json({ application: { ...existing, program } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/summer-programs/user/:userId/applications/:programId
router.delete('/user/:userId/applications/:programId', authMiddleware, (req, res) => {
  const authUserId = req.auth!.userId;
  const { programId } = req.params;
  try {
    spm.removeApplication(authUserId, programId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/summer-programs/user/:userId/followthru
router.get('/user/:userId/followthru', authMiddleware, (req, res) => {
  const userId = req.auth!.userId;
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

    const programData = spm.getProgram(programId);
    const session = spm.createFollowThru(userId, programId, goals, programData || undefined);
    res.status(201).json({ session: { ...session, program: programData } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

function parseNarrativeSuggestion(markdown: string): NarrativeSuggestionJson {
  const result: NarrativeSuggestionJson = { essay_angles: [], interview_points: [], narrative_blurb: '' };
  const lines = markdown.split('\n');
  let section: 'talking' | 'essay' | 'interview' | null = null;
  const talkingPoints: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    const lower = line.toLowerCase();
    if (lower.includes('application talking points') || lower.includes('talking points')) {
      section = 'talking';
      continue;
    }
    if (lower.includes('essay angles')) {
      section = 'essay';
      continue;
    }
    if (lower.includes('interview highlights') || lower.includes('interview points')) {
      section = 'interview';
      continue;
    }
    if (line.startsWith('#')) continue;

    const cleaned = line.replace(/^[-*]\s+/, '').replace(/^\d+[.)]\s+/, '').trim();
    if (!cleaned) continue;

    if (section === 'talking') talkingPoints.push(cleaned);
    if (section === 'essay') result.essay_angles.push(cleaned);
    if (section === 'interview') result.interview_points.push(cleaned);
  }

  result.narrative_blurb = talkingPoints.length ? talkingPoints.join('\n') : markdown.trim();
  return result;
}

// POST /api/summer-programs/user/:userId/followthru/:programId/narrative
// Returns structured narrative suggestions for the non-streaming Follow-thru UI.
router.post('/user/:userId/followthru/:programId/narrative', authMiddleware, async (req, res) => {
  const authUserId = req.auth!.userId;
  const { programId } = req.params;
  try {
    const program = spm.getProgram(programId);
    if (!program) return res.status(404).json({ error: 'Program not found' });

    const followThru = spm.getFollowThru(authUserId, programId);
    if (!followThru) return res.status(404).json({ error: 'Follow-thru session not found' });

    const application = spm.getApplication(authUserId, programId);
    const dossier = await dossierManager.loadDossier(authUserId);
    const narrativeStream = await createSummerNarrativeSuggestStream({
      programName: program.name,
      programDiscipline: program.discipline.join(', '),
      programOutcomes: followThru.program_outcomes
        ? [
            ...followThru.program_outcomes.key_learnings,
            ...followThru.program_outcomes.skills_developed,
            ...followThru.program_outcomes.project_outcomes,
            ...followThru.program_outcomes.narrative_tags,
          ]
        : undefined,
      collegeRecap: followThru.college_recap
        ? [followThru.college_recap.how_it_affected, ...(followThru.college_recap.talking_points || [])]
        : undefined,
      reflections: followThru.reflection_log?.map(r => `[${r.phase}] ${r.content}${r.key_takeaway ? ' — ' + r.key_takeaway : ''}`),
      applicationStatus: application?.status,
      enrollmentDecision: followThru.enrollment_decision || application?.enrollment_decision,
      programAdmissionsSignal: program.admissions_signal,
      whatTheyLookFor: program.what_they_look_for?.join('; '),
      existingDossier: dossier || undefined,
    }, req.body?.model);

    let fullResponse = '';
    for await (const message of narrativeStream) {
      if (message.text) fullResponse += message.text;
    }

    res.json(parseNarrativeSuggestion(fullResponse));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/summer-programs/user/:userId/followthru/:programId
router.delete('/user/:userId/followthru/:programId', authMiddleware, (req, res) => {
  const authUserId = req.auth!.userId;
  const { programId } = req.params;
  try {
    spm.deleteFollowThru(authUserId, programId);
    res.json({ success: true });
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
// Auto-enriches dossier with recap content
router.post('/user/:userId/followthru/:programId/recap', authMiddleware, (req, res) => {
  const { userId, programId } = req.params;
  try {
    const recap = req.body as import('../knowledge/summerProgramManager.js').CollegeRecapEntry;
    spm.saveCollegeRecap(userId, programId, recap);
    const session = spm.getFollowThru(userId, programId);

    // Auto-enrich dossier with recap content
    const program = spm.getProgram(programId);
    if (program) {
      const talkingPoints = recap.talking_points?.join(', ') || '';
      const recapContent = `**How this program affected college applications:** ${recap.how_it_affected || ''}
**Mentioned in essays:** ${recap.mentioned_in_essay ? 'Yes' : 'No'}
**Mentioned in interviews:** ${recap.mentioned_in_interview ? 'Yes' : 'No'}
**Key talking points:** ${talkingPoints}`;
      dossierManager.enrichDossier(userId, recapContent, program.name).catch(err => {
        console.error('[Recap] Dossier enrichment failed:', err?.message || err);
      });
    }

    res.json({ session: { ...session, program } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/summer-programs/user/:userId/followthru/:programId/school
// Body: { schoolId: string; schoolName: string }
router.patch('/user/:userId/followthru/:programId/school', authMiddleware, (req, res) => {
  const authUserId = req.auth!.userId;
  const { programId } = req.params;
  try {
    const { schoolId, schoolName } = req.body as { schoolId: string; schoolName: string };
    if (!schoolId || !schoolName) return res.status(400).json({ error: 'schoolId and schoolName are required' });
    spm.updateFollowThruSession(authUserId, programId, {
      related_target_school_id: schoolId,
      related_target_school_name: schoolName,
    });
    const session = spm.getFollowThru(authUserId, programId);
    const program = spm.getProgram(programId);
    res.json({ session: { ...session, program } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/summer-programs/user/:userId/followthru/:programId/reminders
// Body: { action: 'add'|'toggle'|'delete'; reminder?: { id: string; text: string }; reminderId?: string }
router.patch('/user/:userId/followthru/:programId/reminders', authMiddleware, (req, res) => {
  const authUserId = req.auth!.userId;
  const { programId } = req.params;
  try {
    const { action, reminder, reminderId } = req.body as {
      action: string;
      reminder?: { id: string; text: string };
      reminderId?: string;
    };

    const session = spm.getFollowThru(authUserId, programId);
    if (!session) return res.status(404).json({ error: 'Follow-thru session not found' });

    const reminders = [...(session.reminders || [])];

    if (action === 'add') {
      if (!reminder) return res.status(400).json({ error: 'reminder is required for add action' });
      reminders.push({ id: reminder.id, text: reminder.text, completed: false, created_at: Date.now() });
    } else if (action === 'toggle') {
      if (!reminderId) return res.status(400).json({ error: 'reminderId is required for toggle action' });
      spm.toggleReminder(authUserId, programId, reminderId);
    } else if (action === 'delete') {
      if (!reminderId) return res.status(400).json({ error: 'reminderId is required for delete action' });
      spm.updateFollowThruSession(authUserId, programId, {
        reminders: reminders.filter(r => r.id !== reminderId),
      });
      const updated = spm.getFollowThru(authUserId, programId);
      const program = spm.getProgram(programId);
      return res.json({ session: { ...updated, program } });
    }

    spm.updateFollowThruSession(authUserId, programId, { reminders });
    const updated = spm.getFollowThru(authUserId, programId);
    const program = spm.getProgram(programId);
    res.json({ session: { ...updated, program } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/summer-programs/user/:userId/followthru/:programId/enrollment
// Body: { decision: EnrollmentDecision; deposit_deadline?: string }
router.patch('/user/:userId/followthru/:programId/enrollment', authMiddleware, (req, res) => {
  const { userId, programId } = req.params;
  try {
    const { decision, deposit_deadline } = req.body as {
      decision: 'enrolled' | 'declined_enrollment' | 'pending';
      deposit_deadline?: string;
    };
    const validDecisions = ['enrolled', 'declined_enrollment', 'pending'];
    if (!decision || !validDecisions.includes(decision)) {
      return res.status(400).json({ error: `Invalid decision. Must be one of: ${validDecisions.join(', ')}` });
    }
    spm.updateEnrollmentDecision(userId, programId, decision, deposit_deadline);
    const session = spm.getFollowThru(userId, programId);
    const program = spm.getProgram(programId);
    res.json({ session: { ...session, program } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/summer-programs/user/:userId/followthru/:programId/outcomes
// Body: { key_learnings: string[]; skills_developed: string[]; project_outcomes: string[]; narrative_tags: string[] }
router.patch('/user/:userId/followthru/:programId/outcomes', authMiddleware, (req, res) => {
  const { userId, programId } = req.params;
  try {
    const outcomes = req.body as {
      key_learnings: string[];
      skills_developed: string[];
      project_outcomes: string[];
      narrative_tags: string[];
    };
    spm.updateProgramOutcomes(userId, programId, outcomes);
    const session = spm.getFollowThru(userId, programId);
    const program = spm.getProgram(programId);
    res.json({ session: { ...session, program } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
