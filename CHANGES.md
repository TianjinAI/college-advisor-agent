# Codex Review Fixes — Changes Log

**Date:** 2026-05-08  
**Review basis:** `/home/admin/college-advisor-agent/REVIEW_REPORT.md`

---

## 1. Harvard University Profile (`data/colleges/harvard-university.json`)

### `academics.curriculumStyle`
- **Status:** Already correct (`"General Education + Distribution Requirements + Concentration"`). No change needed. The review report identified the old value `"Core Curriculum + Distribution Requirements"` but it had already been updated.

### `academics.signaturePrograms`
- **Status:** Already correct. The list already included `"General Education Program"` and `"Mind Brain Behavior (MBB) Interdisciplinary Initiative"`, and did NOT contain `"Harvard-Yale Regatta"`, `"House System"`, or `"Harvard Kennedy School undergraduate pipeline"`. No change needed.

### `academics.averageClassSize`
- **Changed from:** `"12-15"`
- **Changed to:** `"12-15 (seminar-level; introductory lecture courses are typically larger)"`
- **Reason:** Review noted this was presented as a hard metric without support and understated large intro courses. Added qualifying note.

### `campus.whatTheyLookFor`
- **Changed from:** `"Harvard seeks students who will change the world—not just succeed in it..."` (marketing/absolute language)
- **Changed to:** More measured language: `"Harvard looks for students who demonstrate intellectual curiosity, leadership potential, and a track record of making meaningful contributions to their communities..."`
- **Reason:** Review flagged "students who will change the world" as too promotional/absolute for an evidence-based knowledge base.

### `campus.applicationTips`
- **Changed from:** Referenced generic "supplemental essays" and "tutorial-style courses" (not a defining Harvard feature).
- **Changed to:** Harvard-specific short-response prompts (e.g., referencing the intellectual life prompt), removed tutorial-style reference, focused on genuine curiosity and personality.
- **Reason:** Review flagged imprecise/dated wording and non-Harvard-specific advice.

---

## 2. Insights Database (`data/experts/insights.json`)

### Structural change: Added metadata wrapper
- The file was previously a bare JSON array `[...]`.
- **Changed to:** An object with `lastUpdated`, `reviewedBy`, and `insights` array:
  ```json
  {
    "lastUpdated": "2026-05-08T04:05:00Z",
    "reviewedBy": "Codex review pass — factual qualification, deduplication, and category tightening",
    "insights": [...]
  }
  ```
- **Reason:** Review requested `lastUpdated` and `reviewedBy` metadata for the file.

### `fa-002` — FAFSA date claim
- **Changed from:** `"File the FAFSA as soon as it opens (October 1 for the following year)"`
- **Changed to:** `"File the FAFSA as soon as it opens (typically October 1 for the upcoming academic year, though the exact date can vary — check studentaid.gov for the current year's opening date)"`
- **Reason:** Review noted the October 1 date is not consistently true post-simplification rollout and should not be hardcoded without a year-specific qualifier.

### `fa-001` — T20 need-met claim
- **Changed from:** `"all T20 schools meet 100% of demonstrated need"`
- **Changed to:** `"Many of the most selective private colleges — including the Ivy League and top liberal arts colleges — meet 100% of demonstrated need for domestic students, but this is not universal across all highly-ranked schools. Always verify each school's specific financial aid policy"`
- **Reason:** Review flagged the T20 claim as too absolute; T20 is not an official category and the statement shouldn't be universalized.

### `strategy-002` — ED advantage claim
- **Changed from:** `"typically offers a significant admissions advantage — sometimes 2-3x higher acceptance rates"` with no qualification.
- **Changed to:** Added context: `"ED rates can appear 2-3x higher than regular decision at some schools. However, these raw numbers can be misleading: ED pools often include recruited athletes, legacy applicants, and highly self-selected candidates who would be strong applicants regardless."`
- **Reason:** Review flagged that raw ED rate comparisons often reflect applicant pool composition, not a pure admissions advantage.

### Deduplication: Merged duplicate "spike" insights
- **Removed:** `extra-001` ("Depth Over Breadth: The Spike Strategy") and `strategy-003` ("The 'Spike' Strategy for Top Schools").
- **Kept and enhanced:** `adm-005` — retitled to `"The 'Spike' Strategy: Depth Over Well-Roundedness"` with merged content from all three entries, including:
  - The spike-vs-well-rounded framing (from adm-005)
  - Depth-in-2-3-activities strategy (from extra-001)
  - Application narrative coherence advice (from strategy-003)
  - Added note: "a spike doesn't mean being one-dimensional; it means having a clear area of excellence while still showing genuine intellectual range."
- **Result:** 59 insights reduced to 57 (2 removed, 1 strengthened).

---

## Summary of All Changes

| File | Change | Type |
|------|--------|------|
| `colleges/harvard-university.json` | `averageClassSize` — added qualifying note | Content fix |
| `colleges/harvard-university.json` | `whatTheyLookFor` — toned down absolute/marketing language | Content fix |
| `colleges/harvard-university.json` | `applicationTips` — made Harvard-specific, removed tutorial reference | Content fix |
| `experts/insights.json` | Added `lastUpdated` and `reviewedBy` top-level metadata | Structural |
| `experts/insights.json` | `fa-002` — qualified FAFSA date claim | Content fix |
| `experts/insights.json` | `fa-001` — qualified T20 need-met claim | Content fix |
| `experts/insights.json` | `strategy-002` — qualified ED advantage claim | Content fix |
| `experts/insights.json` | Merged `adm-005`/`extra-001`/`strategy-003` into one entry | Deduplication |
| `experts/insights.json` | Removed `extra-001` and `strategy-003` | Deduplication |

**Note:** Two Harvard issues flagged in the review report (`curriculumStyle` and `signaturePrograms`) were already fixed prior to this pass and required no changes.
