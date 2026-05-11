# Summer Programs Module — Specification

> Helping students find, apply to, and capitalize on high-impact summer programs — from discovery through the full admissions narrative follow-thru.

---

## 1. Data Model

### 1.1 `SummerProgram` — Knowledge Base Entity (read-only, curated)

Curated once per program; lives in `data/summer-programs/` as JSON files.

```typescript
interface CostInfo {
  amount: number;           // USD, 0 if free
  notes: string;            // e.g. "Full scholarship available", "Need-blind"
}

interface Outcomes {
  college_impact: string;   // e.g. "Strong signal at MIT, Caltech, and top math programs"
  typical_results: string;  // e.g. "~60% of alumni enroll at a top-20 university"
}

interface SummerProgram {
  id: string;               // slug: "ross-2026"
  name: string;             // "Ross Mathematics Program"
  brand: string;             // "Ross Program" (abbreviation/brand name)
  discipline: string[];      // ["math", "number-theory", "abstract-algebra"]
  level: "high-school" | "undergraduate" | "pre-college"
  location: string;         // "Columbus, OH" | "Remote (Synchronous)"
  session_dates: string;    // "June 22 – August 1, 2026"
  duration_weeks: number;
  cost: CostInfo;
  deadline: string;         // ISO date or "rolling" or "TBD"
  application_url: string;
  selectivity: "extremely-competitive" | "very-competitive" | "competitive" | "moderately-selective"
  cohort_size: number;      // e.g. 60
  blurbs: {
    short: string;          // 1-sentence summary for search results
    long: string;           // 2-3 paragraph deep dive
  };
  what_they_look_for: string[];
  curriculum: string;       // description of daily structure/topics
  outcomes: Outcomes;
  admissions_signal: "strong-positive" | "positive" | "neutral" | "mixed"
  parent_org: string;       // e.g. "Ohio State University"
  tags: string[];           // ["math", "research", "prestigious", "free", "remote"]
  prerequisites: {
    grade_range: string;    // e.g. "Grades 9-11"
    prior_knowledge: string[];
    application_requirements: string[];
  };
  essays: {
    prompt: string;
    word_limit: string;
    tips: string[];
  }[];
  featured: boolean;        // show in "featured programs" on home screen
}
```

**Storage:** `data/summer-programs/{id}.json`

---

### 1.2 `SummerApplication` — Per-User Tracker Entity

One per program a user tracks. Lives in `data/users/{userId}/summer/applications.json`.

```typescript
type ApplicationStatus =
  | "researching"      // user saved program but hasn't committed
  | "preparing"        // user is preparing to apply
  | "applied"          // submitted
  | "waitlisted"      // accepted off waitlist
  | "accepted"         // got in
  | "declined"         // user declined offer
  | "rejected";        // not accepted

interface SummerApplication {
  programId: string;
  status: ApplicationStatus;
  notes: string;                // user's personal notes
  deadline_reminder: boolean;   // opt-in reminder 30 days before deadline
  applied_at?: number;          // Unix ms timestamp
  decision_received_at?: number;
  decision_raw?: string;        // e.g. "Accepted to Waitlist"
  created_at: number;
  updated_at: number;
}
```

**Storage:** `data/users/{userId}/summer/applications.json`

---

### 1.3 `SummerFollowThruSession` — Post-Acceptance Lifecycle

Created automatically when a `SummerApplication` transitions to `accepted`. This is the key innovation — turning a summer lookup into a persistent, multi-phase lifecycle.

```typescript
type FollowThruPhase =
  | "pre-program"     // before the program starts
  | "during"         // program is active
  | "post-program"   // program ended, processing experience
  | "college-recap"; // connecting the experience to college applications

interface ReflectionEntry {
  date: string;               // ISO date
  phase: "pre" | "during" | "post";
  content: string;           // free-form reflection
  key_takeaway: string;      // one-sentence summary
  mood?: "excited" | "challenged" | "glowing" | "reflective" | "overwhelmed";
}

interface CollegeRecapEntry {
  programId: string;
  how_it_affected_college_list: string;
  mentioned_in_essay: boolean;
  essay_excerpt?: string;     // the specific passage if written
  mentioned_in_interview: boolean;
  interview_talking_points: string[];
  talking_points_for_applications: string[];
}

interface SummerFollowThruSession {
  id: string;                // e.g. "ross-2026-followthru-{userId}"
  programId: string;
  application_ref: string;   // FK to SummerApplication.programId
  session_id?: string;       // FK to a chat Session in sessions/{sessionId}/ (populated when a chat session is created)
  phase: FollowThruPhase;
  goals: string[];           // what student hopes to accomplish
  reflection_log: ReflectionEntry[];
  college_recap?: CollegeRecapEntry;
  created_at: number;
  updated_at: number;
}
```

**Storage:** `data/users/{userId}/summer/followthru/{programId}.json`

---

### 1.4 Storage Directory Structure

```
data/
  summer-programs/                    # KB — curated once, shipped with app
    ross-2026.json
    ssp-2026.json
    rsi-stemco-2026.json
    mit-primes-2026.json
    ...
  users/
    {userId}/
      summer/
        applications.json             # SummerApplication[] for this user
        followthru/
          ross-2026.json             # SummerFollowThruSession (one per accepted program)
          ...
```

---

## 2. Program Lifecycle

```
Browse / Search programs
    ↓
Add to tracker ("researching")
    ↓
Move to "preparing" — set reminders, read essay prompts
    ↓
Submit application → "applied"
    ↓
Decision received:
  ├── Rejected / Waitlisted → update status, log reflection, optionally advise on alternatives
  └── Accepted → trigger follow-thru session creation
                    ↓
              Create SummerFollowThruSession
                    ↓
              Phase: "pre-program"
              → Set goals for the program
              → Chat session: how to maximize, networking prep, what to bring
                    ↓
              Phase: "during" (auto-transitions on start date)
              → Weekly reflection prompts
              → Log key moments
                    ↓
              Phase: "post-program"
              → What did you learn? What surprised you?
              → Connect to interests / major
                    ↓
              Phase: "college-recap"
              → How does this fit your college narrative?
              → Draft talking points for interviews
              → Draft essay excerpt for applications
              → Link to relevant college list
```

---

## 3. Features

### 3.1 Program Discovery
- Browse by discipline, selectivity, cost (free / under $5k / over $5k), delivery (in-person / remote / hybrid)
- Search by name, keyword, tag
- "Featured programs" — highlighted for admissions impact
- "Match my profile" — filter based on current dossier (interests, GPA, grade level)

### 3.2 Program Detail View
- Full program description, dates, cost breakdown
- What they look for — tailored to student's profile
- Application requirements checklist
- Essay prompt + tips
- Admissions signal strength rating
- "Add to tracker" button

### 3.3 Application Tracker
- Kanban-style board: Researching → Preparing → Applied → Decision
- Deadline countdowns with optional reminders (30 days before)
- Notes per program
- Decision logging

### 3.4 Follow-Thru Sessions
- Triggered automatically on "accepted" status
- Phase-gated prompts:
  - **Pre:** Setting goals, maximizing the experience
  - **During:** Weekly reflection, capture moments
  - **Post:** What happened, what was learned
  - **College Recap:** Narrative bridge to applications
- Linked to chat session for advisor-guided guidance
- CollegeRecap: structured output ready to paste into essays / interviews

### 3.5 Advisor Integration
- "Should I apply to X?" — WebSocket call with dossier context
- "How do I answer the Ross essay prompt?" — linked to Essay Workspace
- "Which of my programs should I mention in my Harvard essay?" — cross-module query

---

## 4. API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/summer/stats` | `{ programCount, byDiscipline }` |
| GET | `/api/summer/programs` | List all programs (supports `?discipline=X&cost=Y&selectivity=Z&q=search`) |
| GET | `/api/summer/programs/featured` | Featured programs only |
| GET | `/api/summer/programs/:id` | Single program detail |
| GET | `/api/summer/user/:userId` | User's applications + follow-thru sessions |
| POST | `/api/summer/user/:userId/applications` | Track a new program |
| PATCH | `/api/summer/user/:userId/applications/:programId` | Update application status |
| DELETE | `/api/summer/user/:userId/applications/:programId` | Remove from tracker |
| POST | `/api/summer/user/:userId/followthru/:programId` | Create follow-thru session (auto on accept) |
| PATCH | `/api/summer/user/:userId/followthru/:programId` | Update follow-thru (phase, reflections, recap) |

---

## 5. WebSocket Messages

| Direction | Type | Description |
|-----------|------|-------------|
| Client → Server | `summer_match` | `{ programs, profile }` — return best-fit programs for student |
| Client → Server | `summer_should_apply` | `{ programId, profile }` — "should I apply?" with dossier context |
| Server → Client | `summer_match_result` | `{ matches: ProgramMatch[] }` |
| Server → Client | `summer_should_apply_result` | `{ recommendation, reasoning }` |

---

## 6. Files

| File | Purpose |
|------|---------|
| `data/summer-programs/*.json` | KB — one JSON per program |
| `server/src/knowledge/summerProgramManager.ts` | Load KB, CRUD for user applications + follow-thru |
| `server/src/routes/summer.ts` | REST API routes |
| `server/src/index.ts` | WebSocket handlers for summer queries |
| `client/src/components/SummerProgramsPanel.tsx` | Browse + search + filters |
| `client/src/components/SummerProgramDetail.tsx` | Full program view + tracker CTA |
| `client/src/components/SummerTracker.tsx` | Application tracker (kanban) |
| `client/src/components/FollowThruSession.tsx` | Follow-thru phase UI |
| `client/src/types.ts` | `SummerProgram`, `SummerApplication`, `SummerFollowThruSession` types |

---

## 7. Initial KB Scope (Phase 1)

Target 30 flagship programs across 6 disciplines:

**Math**
- Ross Mathematics Program
- PROMYS
- Mathcamp (Canada)
- Mathily / Mathily Erdos
- HCSSIM (Hampshire College)
- Canada/USA Mathcamp

**STEM / Research**
- Simons Summer Research Program (STEMCO)
- RSI (Research Science Institute)
- SSP (Summer Science Program) — Astrophysics / Genome
- MIT Primes / MIT Primes USA
- Yale Summer Session (YSS)

**CS / AI**
- PROMYS for Teachers (skip)
- KPCB / Kleiner Perkins (skip)
- TISM (The Institute for Social Media)
- AI4ALL / Stanford AI4ALL
- Breakthrough Labs

**Leadership / Policy**
- Telluride Association (EAST / WEST / MESA)
- YYGS (Yale Young Global Scholars)
- LBW (Leadership in the Business World)
- MCP (Mitchell Leadership)

**Writing / Humanities**
- TASP (Telluride Association Summer Program) — Humanities
- Iowa Young Writers Studio
- Kenyon Review Young Writers
- NYU Precollege Writing

**General Prestige**
- SSHI (Stanford Summer Humanities Institute)
- Summer Discovery
- Georgetown Summer Honors

---

## 7. Initial KB Scope (Phase 1)

Target 30 flagship programs across 6 disciplines. **21 of 21 written to `data/summer-programs/`.**

**Math** ✅
- Ross Mathematics Program ✅
- PROMYS ✅
- Canada/USA Mathcamp ✅
- Mathily ✅
- HCSSIM ✅

**STEM / Research** ✅
- Simons Summer Research Program (STEMCO) ✅
- RSI — Research Science Institute ✅
- SSP — Summer Science Program ✅
- MIT Primes ✅
- Yale Summer Session ✅

**Leadership / Policy** ✅
- YYGS — Yale Young Global Scholars ✅
- LBW — Leadership in the Business World ✅
- Telluride EAST ✅
- Telluride WEST ✅

**Telluride Association** ✅
- TASP — Telluride Association Summer Program (Humanities) ✅

**Writing / Humanities** ✅
- Iowa Young Writers Studio ✅
- Kenyon Review Young Writers ✅
- NYU Precollege Writing ✅

**General Prestige** ✅
- SSHI — Stanford Summer Humanities Institute ✅
- Georgetown Summer Honors ✅
- MIT Launch Summer ✅

**Still needed (9):**
- Breakthrough Labs (CS/AI)
- AI4-All / Stanford AI4-All
- Mitchell Leadership
- Telluride MESA
- Telluride Association (additional programs vary by year)
- Summer Discovery
- Other specialized programs

> **Note:** Data sourced from training knowledge of well-documented programs. Factual fields (dates, costs, deadlines, locations, selectivity, cohort size) are accurate to the best of this model's knowledge. **admissions_signal**, **outcomes**, **what_they_look_for** are expert judgment fields — marked with values from general admissions knowledge. Verify exact dates/costs against official websites before final use.

## 8. Status

✅ Data model complete  
✅ KB: 21/30 programs written  
⏳ `summerProgramManager.ts` (load KB + CRUD) — pending  
⏳ REST API routes + WebSocket handlers — pending  
⏳ Frontend: browse → detail → tracker → follow-thru UI — pending
