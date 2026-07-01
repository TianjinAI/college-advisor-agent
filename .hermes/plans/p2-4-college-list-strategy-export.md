# Phase 2 #4 — College List Strategy & Export

> A unified college planning artifact that bridges College Advisor strategy and Financial Aid affordability.

---

## Goal

Transform "My College List" from rough scratchpad into **family-ready application strategy plan** that accounts for both admissions odds and financial reality.

## Motivation

Families don't think in two boxes. They ask "should I apply here and can we afford it?" The current split — CA for strategy, FA for affordability — forces manual cross-referencing. This phase makes the college list the **single shared planning artifact**:

- CA owns fit/scope/strategy
- FA bridges affordability data into the same record
- Export/print produces one document with both dimensions

---

## Data Model Changes

### TargetSchool (client/src/types.ts + server/src/types.ts)

New optional fields. All optional so old persisted JSON survives:

```ts
// ─── Application operations ───
applicationDeadline?: string;
applicationPortal?: 'Common App' | 'Coalition' | 'UC' | 'School Portal' | 'Other' | '';
deadlineType?: 'ED' | 'EA' | 'REA' | 'RD' | 'Rolling' | 'Priority' | '';
supplementalEssayCount?: string;
supplementalEssayNotes?: string;
portfolioRequired?: boolean;
testPolicy?: 'Required' | 'Optional' | 'Blind' | 'Flexible' | 'Unknown' | '';

// ─── Priority & ownership ───
priority?: 'High' | 'Medium' | 'Low' | '';
owner?: 'Student' | 'Parent' | 'Counselor' | 'Recommender' | '';
lastReviewedAt?: number;

// ─── Next actions (action plan) ───
nextAction?: string;
nextActionDueDate?: string;

// ─── Financial Aid bridge (sync'd from FA Schools tab) ───
financialFitNotes?: string;
estimatedNetPrice?: string;
aidStrategy?: 'need-based only' | 'merit only' | 'both' | 'none' | '';
cssProfileRequired?: boolean;
fafsaRequired?: boolean;
faPriorityDeadline?: string;
meetsFullNeed?: boolean;
noLoanPolicy?: boolean;
```

### College List Payload (server: dossier.ts)

Server-side `getCollegeList` / `saveCollegeList` payload expanded:

```ts
{
  targetSchools: TargetSchool[];
  locked: boolean;
  lockedAt?: number;
  updatedAt: number;
}
```

Backward compatible: old payloads with only `targetSchools` work on read; `locked` defaults to `false`.

---

## UI Changes

### Part A: Grouped College List View

**File:** `client/src/components/CollegeListPanel.tsx`

Current flat linear list → grouped sections:

1. **Reach** (with count)
2. **Match** (with count)
3. **Safety** (with count)
4. **Unassigned** (with count)

#### Balance warnings
In plain English, shown below grouped headers:

> "⚠️ Your list leans heavy on reaches — add 2-3 Match/Safety schools to balance."
> "⚠️ 5 schools missing an application strategy. Pick ED/EA/RD for each."
> "⚠️ 3 schools have no deadline set."
> "⚠️ 2 schools list CSS Profile required — check FA deadlines."

Conditions:
- Reaches > 50% of total → "leaning heavy on reaches"
- Match + Safety < 2 → "add 2-3 Match/Safety schools"
- Any school without strategy → "missing application strategy"
- Any school without deadline → "no deadline set"
- Any school with cssProfileRequired=true → "CSS Profile required"

#### Readiness badge per school
Visible helper that tells families what's missing. Two-color dot + label:

| State | Badge |
|-------|-------|
| All core fields filled | `✅ Ready` |
| Missing strategy only | `⚠️ Need strategy` |
| Missing deadline only | `⚠️ Need deadline` |
| Missing both | `⚠️ Incomplete` |
| Missing essay/recommender/next-action (optional) | `🔄 Needs work` |

Core fields checked: status (Reach/Match/Safety), strategy (ED/EA/REA/RD), intendedMajor, applicationDeadline.

#### School card layout
```
┌──────────────────────────────────────────────────┐
│  School Name                        [Reach] [✅ Ready]  ✕ │
│  Intended Major: Computer Science                     │
│  Strategy: ED  ─  Deadline: Nov 1                     │
│  ▼ More details ...                                   │
└──────────────────────────────────────────────────┘
```

Details drawer keeps existing fields (notes, appNarrative, recommenders) plus new fields:
- Application portal, test policy, essay count/notes
- FA: estimated net price, aid strategy, CSS/FAFSA status
- Priority, owner, next action + due date
- Last reviewed timestamp

### Part B: Export Modal Upgrade

**File:** `client/src/components/CollegeListExport.tsx`

Complete redesign into structured booklet. Sections:

#### 1. Title
```
College Application Plan
Prepared [date] by [displayName]
```

#### 2. Summary Dashboard
```
Total schools: 12
  Reach:  6    Match: 4    Safety: 2
Early apps: 5 (2 ED, 3 EA)
Schools with all fields complete: 7 / 12
Affordability data available: 8 / 12
```

#### 3. Schools by Group
Each school section has:
- Name + Status badge
- Strategy + Deadline
- Intended major
- Application narrative (if set)
- Recommendation suggesters (if set)
- Essay requirements + notes
- Test policy
- **FA: Estimated net price + aid strategy + CSS/FAFSA notes**
- **FA: policy highlights (full-need badge, no-loan badge)**
- Priority, owner, next action

Three groups: Reach, Match, Safety. Each group labeled with count.

#### 4. Financial Aid Overview
School-level FA summary table (plain layout, not HTML table — use cards or lists):
- Meets full need? / No loan? / CSS Profile required?
- Estimated net price vs family budget range
- FA priority deadline (may differ from app deadline)
- Aid strategy recommendation

#### 5. Deadline Timeline
Schools sorted by deadline proximity:
- Before [month]: School A (ED), School B (EA)
- [month]: School C (RD), School D (RD)
- ...

#### 6. Next Actions
Flat list of all nextAction fields with school name, due date, and owner.

#### 7. Plain-English Footnotes
Same as current but expanded to cover FA terms.

### Part C: CSV Export

Button in export toolbar: "Download CSV"

Fields (one row per school):
```
School, Status, Strategy, Major, Deadline, Portal, Essays, TestPolicy,
NetPrice, MeetsFullNeed, NoLoan, CSSProfile, FAFSA, AidStrategy,
Priority, Owner, NextAction, NextActionDue, Notes
```

### Part D: Lock State Persistence

**Files:** `client/src/App.tsx`, `server/src/routes/sessions.ts`, `server/src/knowledge/dossier.ts`

Current: lock is React state only. Refresh loses it.

Changes:
1. Server college-list payload expanded to `{ targetSchools, locked, lockedAt, updatedAt }`
2. `PUT /api/user/college-list` now saves lock state
3. `GET /api/user/college-list` returns full payload
4. On hydrate, restore `locked` state
5. Lock timestamp shown in UI: "🔒 Locked Jan 15, 2026 — ready for FA review"

Lock behavior:
- Disables all editing fields
- Shows locked timestamp
- Export/Print still available
- "Unlock to make changes" prompt on hover
- Lock syncs to server so it persists across refreshes

### Part E: FA Sync on Lock

When list is locked, optionally trigger FA data bridge:

1. Client calls `GET /api/fa/schools/import-data?schools=SchoolA,SchoolB,...`
   OR FA data has already been populated in FASchoolsPanel
2. Response includes per-school FA data packet: `{ css_profile_required, fafsa_required, meets_full_need, no_loan_policy, fa_priority_deadline }`
3. Client merges into TargetSchool[].estimatedNetPrice, cssProfileRequired, etc.
4. Saves to server via PUT /api/user/college-list

Implementation note: estimatedNetPrice calculation uses FASchool.net_price_by_income bands matched against FinancialProfile. If FA profile incomplete, show "Estimated net price available once FA profile complete."

This part depends on FA Schools tab data already existing. If FA Schools tab hasn't been populated for this user, the sync gracefully skips and shows "Link FA profile and explore schools in Financial Aid mode to see affordability data here."

---

## Server Changes

### `server/src/types.ts`
- Expand TargetSchool with all new optional fields
- Keep backward compatible

### `server/src/knowledge/dossier.ts`
- update `getCollegeList()` / `saveCollegeList()` to handle expanded payload
- backward compatible read of old format

### `server/src/routes/sessions.ts`
- No new routes needed
- Existing college-list routes handle expanded payload

### New: `GET /api/fa/schools/export-data`
Optional endpoint used by the FA sync step.

Query: `?schools=SchoolA,SchoolB`

Response:
```json
{
  "schools": {
    "SchoolA": {
      "css_profile_required": true,
      "fafsa_required": true,
      "meets_full_need": true,
      "no_loan_policy": false,
      "fa_priority_deadline": "2026-02-15",
      "estimatedNetPrice": "~$15,000"
    }
  }
}
```

If FASchool data not available for a school, that entry is omitted.

---

## CSS Changes

### `client/src/styles/index.css`

1. **Group headers** — Reach/Match/Safety section titles with count badges
2. **Balance warnings** — yellow alert banners
3. **Readiness badges** — `✅ Ready`, `⚠️ Need X` styling
4. **FA fields** — subtle blue tint to identify FA data in school cards
5. **Lock timestamp** — styled hint below lock label
6. **Export print CSS** (current mostly works, adjust for new sections)

Print CSS key behavior:
- Hide app shell, show only export sheet
- Page breaks before each major section
- Status badges preserve color (`print-color-adjust: exact`)
- FA data in distinct visual column

---

## Implementation Order

| # | Step | Files | Notes |
|---|------|-------|-------|
| 1 | Expand TargetSchool types | client + server types.ts | All optional fields |
| 2 | Expand dossier.ts payload | server/src/knowledge/dossier.ts | lock state + backward compat |
| 3 | Update college-list routes | server/src/routes/sessions.ts | Handle expanded save/load |
| 4 | Grouped view + helpers | CollegeListPanel.tsx | groupSchoolsByStatus, getReadinessStatus, getWarnings, sortByDeadline |
| 5 | New school card layout | CollegeListPanel.tsx | Core fields + details drawer with new fields |
| 6 | Balance warnings | CollegeListPanel.tsx | Under group headers |
| 7 | Readiness badges | CollegeListPanel.tsx | Per-school badge |
| 8 | Lock persistence | App.tsx + dossier.ts | Sync lock to server, restore on hydrate |
| 9 | FA sync on lock | App.tsx + new FA export endpoint | Fetch FA data, merge into schools |
| 10 | Export modal redesign | CollegeListExport.tsx | Summary, groups, FA overview, timeline, actions |
| 11 | CSV export | CollegeListExport.tsx | Blob download |
| 12 | Print CSS | index.css | Sections, page breaks, badges |
| 13 | CSS polish | index.css | Group headers, warnings, FA distinction |
| 14 | Build + verify | n/a | npm run build, deploy, browser test |
| 15 | README update | README.md | Mark #4 complete |
| 16 | Git commit | n/a | Commit + push on request |

---

## Acceptance Criteria

- User can build 10-20 school list with grouped Reach/Match/Safety sections
- Balance warnings visible in plain English (e.g. "Too many reaches")
- Readiness badge per school visible
- All new TargetSchool fields editable in details drawer
- Lock state survives page refresh
- Export button opens polished booklet with summary + all sections
- FA data appears in export (CSS Profile, net price, meet full need badges)
- CSV download produces valid file
- `npm run build` passes
- Browser login + verification passes with screenshot evidence
- Old saved college-list.json loads without error

---

## Out of Scope

- AI-generated recommendations for missing fields (future)
- Version history or change tracking
- Interactive deadline calendar
- Parent dashboard
- Application portal integrations (Common App API, etc.)

---

## Risks

- **Backward compat**. Old `college-list.json` files only have `targetSchools`. The read handler must tolerate missing `locked` / `lockedAt` fields.
- **FA data dependency**. If FA Schools tab / KB hasn't populated school FA data, the FA sync step produces silence. Mitigation: graceful skip with helpful message.
- **Export print CSS**. Browsers handle print CSS inconsistently. Mitigation: test in Chrome first; CSV export as fallback.
- **Lock granularity**. One lock for the whole list. Multi-school partial lock not needed yet.
