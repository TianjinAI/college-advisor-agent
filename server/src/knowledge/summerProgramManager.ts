/**
 * Summer Programs Manager
 * - Loads KB from data/summer-programs/ (read-only program data)
 * - Manages per-user applications: data/users/{userId}/summer/applications.json
 * - Manages follow-thru sessions: data/users/{userId}/summer/followthru/{programId}.json
 */

import * as fs from 'fs';
import * as path from 'path';

// ─── KB Types ─────────────────────────────────────────────────────────────────

export interface SummerProgram {
  id: string;
  name: string;
  brand: string;
  discipline: string[];
  level: string;
  location: string;
  session_dates: string;
  duration_weeks: number;
  cost: { amount: number; notes: string };
  deadline: string;
  application_url: string;
  selectivity: 'extremely-competitive' | 'very-competitive' | 'competitive' | 'moderately-selective';
  cohort_size: number;
  parent_org: string;
  tags: string[];
  prerequisites: {
    grade_range: string;
    prior_knowledge: string[];
    application_requirements: string[];
  };
  essays: Array<{
    prompt: string;
    word_limit: string;
    tips: string[];
  }>;
  featured: boolean;
  admissions_signal: 'strong-positive' | 'positive' | 'neutral' | 'mixed';
  outcomes: {
    college_impact: string;
    typical_results: string;
  };
  what_they_look_for: string[];
  blurbs: { short: string; long: string };
  curriculum: string;
  SCRAPED_FROM: string;
}

// ─── User State Types ──────────────────────────────────────────────────────────

export type ApplicationStatus =
  | 'researching'
  | 'preparing'
  | 'applied'
  | 'waitlisted'
  | 'accepted'
  | 'declined'
  | 'rejected'
  | 'enrollment_decision';

export type EnrollmentDecision = 'enrolled' | 'declined_enrollment' | 'pending';

export interface SummerApplication {
  programId: string;
  status: ApplicationStatus;
  notes: string;
  deadline_reminder: boolean;
  applied_at?: number;
  decision_received_at?: number;
  decision_status?: string;
  enrollment_decision?: EnrollmentDecision;
  enrollment_decision_date?: number;
  deposit_deadline?: string;
  deposit_paid?: boolean;
  created_at?: number;
  updated_at?: number;
}

export type FollowThruPhase = 'pre-program' | 'during' | 'post-program' | 'college-recap';

export interface ReflectionEntry {
  date: string;
  phase: 'pre' | 'during' | 'post';
  content: string;
  key_takeaway: string;
  mood?: 'excited' | 'challenged' | 'glowing' | 'reflective';
}

export interface CollegeRecapEntry {
  programId: string;
  how_it_affected: string;
  mentioned_in_essay: boolean;
  mentioned_in_interview: boolean;
  talking_points: string[];
}

export interface SummerFollowThruSession {
  programId: string;
  phase: FollowThruPhase;
  goals: string[];
  reflection_log: ReflectionEntry[];
  college_recap?: CollegeRecapEntry;
  related_target_school_id?: string;
  related_target_school_name?: string;
  reminders?: Array<{ id: string; text: string; completed: boolean; created_at: number }>;
  enrollment_decision?: EnrollmentDecision;
  enrollment_decision_date?: number;
  deposit_deadline?: string;
  deposit_paid?: boolean;
  program_outcomes?: {
    key_learnings: string[];
    skills_developed: string[];
    project_outcomes: string[];
    narrative_tags: string[];
  };
  created_at: number;
  updated_at: number;
}

// ─── Manager ───────────────────────────────────────────────────────────────────

export class SummerProgramManager {
  private programsCache: Map<string, SummerProgram> = new Map();
  private kbLoaded = false;

  constructor(private programsDir: string, private usersDir: string) {}

  // ── KB Access ──────────────────────────────────────────────────────────────

  /** Load all programs from the KB directory */
  private loadKB(): void {
    if (this.kbLoaded) return;
    const dir = this.programsDir;
    if (!fs.existsSync(dir)) {
      console.warn('[SummerKB] Programs directory not found:', dir);
      return;
    }
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
    for (const file of files) {
      const raw = fs.readFileSync(path.join(dir, file), 'utf-8');
      const program = JSON.parse(raw) as SummerProgram;
      this.programsCache.set(program.id, program);
    }
    this.kbLoaded = true;
    console.log(`[SummerKB] Loaded ${this.programsCache.size} programs`);
  }

  /** List all programs in KB */
  listPrograms(): SummerProgram[] {
    this.loadKB();
    return Array.from(this.programsCache.values());
  }

  /** Get a single program by ID */
  getProgram(id: string): SummerProgram | null {
    this.loadKB();
    return this.programsCache.get(id) || null;
  }

  /** Search programs by keyword (name, discipline, tags, parent_org) */
  searchPrograms(q: string): SummerProgram[] {
    this.loadKB();
    const lower = q.toLowerCase();
    return Array.from(this.programsCache.values()).filter(p =>
      p.name.toLowerCase().includes(lower) ||
      p.brand.toLowerCase().includes(lower) ||
      p.discipline.some(d => d.toLowerCase().includes(lower)) ||
      p.tags.some(t => t.toLowerCase().includes(lower)) ||
      p.parent_org.toLowerCase().includes(lower) ||
      p.blurbs.short.toLowerCase().includes(lower)
    );
  }

  /** Filter programs by discipline tag */
  filterByDiscipline(discipline: string): SummerProgram[] {
    this.loadKB();
    return Array.from(this.programsCache.values()).filter(p =>
      p.discipline.includes(discipline) || p.tags.includes(discipline)
    );
  }

  /** Filter programs by max cost (0 = free only) */
  filterByMaxCost(maxAmount: number): SummerProgram[] {
    this.loadKB();
    return Array.from(this.programsCache.values()).filter(p =>
      maxAmount === 0 ? p.cost.amount === 0 : p.cost.amount <= maxAmount
    );
  }

  /** Filter by selectivity */
  filterBySelectivity(
    level: 'extremely-competitive' | 'very-competitive' | 'competitive' | 'moderately-selective'
  ): SummerProgram[] {
    this.loadKB();
    const levels = ['moderately-selective', 'competitive', 'very-competitive', 'extremely-competitive'];
    const idx = levels.indexOf(level);
    return Array.from(this.programsCache.values()).filter(p =>
      levels.indexOf(p.selectivity) <= idx
    );
  }

  // ── User Applications ───────────────────────────────────────────────────────

  private getUserDir(userId: string): string {
    return path.join(this.usersDir, userId, 'summer');
  }

  private getApplicationsFile(userId: string): string {
    return path.join(this.getUserDir(userId), 'applications.json');
  }

  private ensureUserDir(userId: string): void {
    const dir = this.getUserDir(userId);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /** List all applications for a user */
  listApplications(userId: string): SummerApplication[] {
    const file = this.getApplicationsFile(userId);
    if (!fs.existsSync(file)) return [];
    return JSON.parse(fs.readFileSync(file, 'utf-8')) as SummerApplication[];
  }

  /** Get a single application by programId */
  getApplication(userId: string, programId: string): SummerApplication | null {
    const apps = this.listApplications(userId);
    return apps.find(a => a.programId === programId) || null;
  }

  /** Upsert an application */
  saveApplication(userId: string, app: SummerApplication): void {
    this.ensureUserDir(userId);
    const apps = this.listApplications(userId);
    const idx = apps.findIndex(a => a.programId === app.programId);
    if (idx >= 0) {
      apps[idx] = { ...app, updated_at: Date.now() };
    } else {
      apps.push({ ...app, created_at: Date.now(), updated_at: Date.now() });
    }
    fs.writeFileSync(this.getApplicationsFile(userId), JSON.stringify(apps, null, 2), 'utf-8');
  }

  /** Update status */
  updateStatus(userId: string, programId: string, status: ApplicationStatus): void {
    const app = this.getApplication(userId, programId);
    if (!app) throw new Error(`No application found for ${programId}`);
    app.status = status;
    if (status === 'applied') app.applied_at = Date.now();
    if (['accepted', 'rejected', 'waitlisted'].includes(status)) {
      app.decision_received_at = Date.now();
      app.decision_status = status;
    }
    this.saveApplication(userId, app);
  }

  /** Remove an application */
  removeApplication(userId: string, programId: string): void {
    const apps = this.listApplications(userId).filter(a => a.programId !== programId);
    const file = this.getApplicationsFile(userId);
    fs.writeFileSync(file, JSON.stringify(apps, null, 2), 'utf-8');
  }

  // ── Follow-Thru Sessions ────────────────────────────────────────────────────

  private getFollowThruFile(userId: string, programId: string): string {
    return path.join(this.getUserDir(userId), 'followthru', `${programId}.json`);
  }

  private ensureFollowThruDir(userId: string): void {
    const dir = path.join(this.getUserDir(userId), 'followthru');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /** Get follow-thru session for a program */
  getFollowThru(userId: string, programId: string): SummerFollowThruSession | null {
    const file = this.getFollowThruFile(userId, programId);
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, 'utf-8')) as SummerFollowThruSession;
  }

  /** List all follow-thru sessions for a user */
  listFollowThru(userId: string): SummerFollowThruSession[] {
    const dir = path.join(this.getUserDir(userId), 'followthru');
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir)
      .filter(f => f.endsWith('.json'))
      .map(f => {
        const raw = fs.readFileSync(path.join(dir, f), 'utf-8');
        return JSON.parse(raw) as SummerFollowThruSession;
      });
  }

  /** Generate milestone reminders for a program based on its metadata */
  generateMilestones(program: { discipline?: string[]; session_dates?: string; deadline?: string; name?: string; brand?: string }): Array<{ id: string; text: string; completed: boolean; created_at: number }> {
    const milestones: Array<{ id: string; text: string; completed: boolean; created_at: number }> = [];
    const now = Date.now();

    // Core milestones every program gets
    milestones.push({ id: `ms-${now}-1`, text: `Research the faculty/instructors leading this program`, completed: false, created_at: now });
    milestones.push({ id: `ms-${now}-2`, text: `Prepare 2-3 thoughtful questions to ask during the program`, completed: false, created_at: now });

    // Discipline-specific milestones
    const disc = (program.discipline || []).map(d => d.toLowerCase());
    if (disc.some(d => ['math', 'stem', 'research', 'cs'].includes(d))) {
      milestones.push({ id: `ms-${now}-3`, text: `Identify a specific research question or math problem you want to explore during the program`, completed: false, created_at: now });
      milestones.push({ id: `ms-${now}-4`, text: `Read recent work by the program's lead faculty`, completed: false, created_at: now });
    }
    if (disc.some(d => ['writing', 'humanities'].includes(d))) {
      milestones.push({ id: `ms-${now}-3`, text: `Draft a reading list related to the program theme`, completed: false, created_at: now });
      milestones.push({ id: `ms-${now}-4`, text: `Start a journal to capture observations for later essays`, completed: false, created_at: now });
    }
    if (disc.some(d => ['leadership', 'policy'].includes(d))) {
      milestones.push({ id: `ms-${now}-3`, text: `Outline the key social/policy issues you want to study`, completed: false, created_at: now });
      milestones.push({ id: `ms-${now}-4`, text: `Prepare a case study from your own experience to share in discussions`, completed: false, created_at: now });
    }

    // Post-program milestones — bridge to college application narrative
    milestones.push({ id: `ms-${now}-5`, text: `Draft a one-page summary: what you did, learned, and how it connects to your college goals`, completed: false, created_at: now });
    milestones.push({ id: `ms-${now}-6`, text: `Identify 3 talking points from this program for college interviews`, completed: false, created_at: now });
    milestones.push({ id: `ms-${now}-7`, text: `Draft an essay excerpt about this experience for college applications`, completed: false, created_at: now });

    return milestones;
  }

  /** Create a new follow-thru session with auto-generated milestones */
  createFollowThru(userId: string, programId: string, goals: string[], program?: SummerProgram): SummerFollowThruSession {
    this.ensureFollowThruDir(userId);
    const milestones = this.generateMilestones(program || {});
    const session: SummerFollowThruSession = {
      programId,
      phase: 'pre-program',
      goals,
      reflection_log: [],
      reminders: milestones,
      created_at: Date.now(),
      updated_at: Date.now(),
    };
    fs.writeFileSync(this.getFollowThruFile(userId, programId), JSON.stringify(session, null, 2), 'utf-8');
    return session;
  }

  /** Add a reflection entry */
  addReflection(userId: string, programId: string, entry: ReflectionEntry): void {
    const session = this.getFollowThru(userId, programId);
    if (!session) throw new Error(`No follow-thru session found for ${programId}`);
    session.reflection_log.push(entry);
    // Auto-advance phase based on entry
    if (entry.phase === 'during') session.phase = 'during';
    if (entry.phase === 'post') session.phase = 'post-program';
    session.updated_at = Date.now();
    fs.writeFileSync(this.getFollowThruFile(userId, programId), JSON.stringify(session, null, 2), 'utf-8');
  }

  /** Update phase */
  updatePhase(userId: string, programId: string, phase: FollowThruPhase): void {
    const session = this.getFollowThru(userId, programId);
    if (!session) throw new Error(`No follow-thru session found for ${programId}`);
    session.phase = phase;
    session.updated_at = Date.now();
    fs.writeFileSync(this.getFollowThruFile(userId, programId), JSON.stringify(session, null, 2), 'utf-8');
  }

  /** Save college recap */
  saveCollegeRecap(userId: string, programId: string, recap: CollegeRecapEntry): void {
    const session = this.getFollowThru(userId, programId);
    if (!session) throw new Error(`No follow-thru session found for ${programId}`);
    session.phase = 'college-recap';
    session.college_recap = recap;
    session.updated_at = Date.now();
    fs.writeFileSync(this.getFollowThruFile(userId, programId), JSON.stringify(session, null, 2), 'utf-8');
  }

  /** Update enrollment decision for a follow-thru session */
  updateEnrollmentDecision(userId: string, programId: string, decision: EnrollmentDecision, depositDeadline?: string, depositPaid?: boolean): void {
    const session = this.getFollowThru(userId, programId);
    if (!session) throw new Error(`No follow-thru session found for ${programId}`);
    session.enrollment_decision = decision;
    session.enrollment_decision_date = Date.now();
    if (depositDeadline) session.deposit_deadline = depositDeadline;
    if (depositPaid !== undefined) session.deposit_paid = depositPaid;
    session.updated_at = Date.now();
    fs.writeFileSync(this.getFollowThruFile(userId, programId), JSON.stringify(session, null, 2), 'utf-8');

    // Also update the application record
    const app = this.getApplication(userId, programId);
    if (app) {
      app.enrollment_decision = decision;
      app.enrollment_decision_date = Date.now();
      if (depositDeadline) app.deposit_deadline = depositDeadline;
      if (depositPaid !== undefined) app.deposit_paid = depositPaid;
      if (decision === 'enrolled') app.status = 'enrollment_decision';
      if (decision === 'declined_enrollment') app.status = 'declined';
      this.saveApplication(userId, app);
    }
  }

  /** Update program outcomes on a follow-thru session */
  updateProgramOutcomes(userId: string, programId: string, outcomes: {
    key_learnings: string[];
    skills_developed: string[];
    project_outcomes: string[];
    narrative_tags: string[];
  }): void {
    const session = this.getFollowThru(userId, programId);
    if (!session) throw new Error(`No follow-thru session found for ${programId}`);
    session.program_outcomes = outcomes;
    session.updated_at = Date.now();
    fs.writeFileSync(this.getFollowThruFile(userId, programId), JSON.stringify(session, null, 2), 'utf-8');
  }

  /** Update follow-thru session fields (e.g. school association, reminders) */
  updateFollowThruSession(userId: string, programId: string, updates: Partial<SummerFollowThruSession>): void {
    const session = this.getFollowThru(userId, programId);
    if (!session) throw new Error(`No follow-thru session found for ${programId}`);
    const merged: SummerFollowThruSession = {
      ...session,
      ...updates,
      updated_at: Date.now(),
    };
    fs.writeFileSync(this.getFollowThruFile(userId, programId), JSON.stringify(merged, null, 2), 'utf-8');
  }

  /** Toggle reminder completed */
  toggleReminder(userId: string, programId: string, reminderId: string): void {
    const session = this.getFollowThru(userId, programId);
    if (!session || !session.reminders) return;
    session.reminders = session.reminders.map(r =>
      r.id === reminderId ? { ...r, completed: !r.completed } : r
    );
    session.updated_at = Date.now();
    fs.writeFileSync(this.getFollowThruFile(userId, programId), JSON.stringify(session, null, 2), 'utf-8');
  }

  /** Delete a follow-thru session */
  deleteFollowThru(userId: string, programId: string): void {
    const file = this.getFollowThruFile(userId, programId);
    if (fs.existsSync(file)) fs.unlinkSync(file);
  }

  /** Get KB stats */
  getKBStats(): { programCount: number; byDiscipline: Record<string, number> } {
    this.loadKB();
    const byDiscipline: Record<string, number> = {};
    for (const p of this.programsCache.values()) {
      for (const d of p.discipline) {
        byDiscipline[d] = (byDiscipline[d] || 0) + 1;
      }
    }
    return { programCount: this.programsCache.size, byDiscipline };
  }
}
