# College Knowledge Base Review

## Overall Quality Assessment

**Score: 7/10**

The knowledge base is substantially populated and generally useful for admissions advising. The Harvard enrichment fields are all filled with nontrivial content, and the 59 insights cover many of the highest-value advising topics. The main quality problems are factual looseness, overconfident wording, repeated ideas across multiple insights, and a few category gaps.

## Harvard Record Review

File reviewed: `data/colleges/harvard-university.json`

### Population and substance

All requested enrichment fields are populated and substantive:

- `campus.culture`
- `campus.whatTheyLookFor`
- `campus.applicationTips`
- `campus.distinctiveTraits`
- `campus.setting`
- `academics.strengths`
- `academics.signaturePrograms`
- `academics.curriculumStyle`
- `academics.stemStrength`
- `academics.averageClassSize`

### Factual errors or questionable claims

- `academics.curriculumStyle`: `"Core Curriculum + Distribution Requirements"` is outdated/inaccurate. Harvard College no longer uses the old Core Curriculum; current framing should reflect General Education plus distribution/departmental requirements.
- `academics.signaturePrograms`: several entries are weak fits or questionable as “signature academic programs.”
  - `Harvard-Yale Regatta` is a famous tradition, but not an academic signature program.
  - `House System` is central to student life, but it belongs more naturally under campus life than academics.
  - `Harvard Kennedy School undergraduate pipeline` is vague and not a standard, clearly identifiable undergraduate program name.
- `campus.applicationTips`: references to “supplemental essays” and “the Harvard essay” are imprecise. Harvard has specific short-response/essay requirements that can change; this wording reads generic rather than institution-specific.
- `campus.applicationTips`: “tutorial-style courses” is not a strong Harvard-wide descriptor. Tutorials exist in some contexts, but this is not a defining general feature of the Harvard undergraduate experience.
- `campus.whatTheyLookFor`: “students who will change the world” is plausible as marketing language but too absolute and promotional for a knowledge base intended to sound evidence-based.
- `academics.averageClassSize`: `12-15` may be directionally plausible for seminars/smaller classes, but it is presented as a hard metric without support and may understate the presence of large introductory courses.

### Bottom line on Harvard record

The record is usable, but not yet clean enough to serve as a high-trust canonical entry. The biggest issue is not missing text; it is mixing accurate detail with marketing language and a few miscategorized or dated facts.

## Insights Review

File reviewed: `data/experts/insights.json`

### Coverage and categorization

The file contains **59 insights** across these categories:

- `admissions`: 9
- `essays`: 9
- `extracurriculars`: 9
- `financial-aid`: 7
- `strategy`: 9
- `timeline`: 6
- `interviews`: 5
- `general`: 5

This is a solid baseline structure. The categories are mostly intuitive and useful for advising workflows.

### What works well

- High practical utility for mainstream U.S. selective-college advising.
- Strong emphasis on essays, activities, recommendation letters, timelines, and financial aid basics.
- Most entries are written in clear, student-facing language and would be useful in a counseling context.
- The corpus does a good job translating broad admissions concepts into action-oriented advice.

### Categorization and content issues

- There is meaningful redundancy:
  - `adm-005`, `extra-001`, and `strategy-003` all cover the “spike” idea from slightly different angles.
  - `adm-008` and `strategy-005` are both transfer-pathway advice.
  - `strategy-006` and `essays-009` overlap heavily on Additional Information usage.
- Some entries are weakly categorized:
  - `adm-004` is really application mechanics or activities-list strategy, not pure admissions theory.
  - `essays-005` is about activities-list writing, not essays in the normal sense.
- Several insights rely on claims that are too broad, too absolute, or too hard to verify as written.

### Factual errors or questionable claims

- `fa-002`: says FAFSA opens on **October 1**. That has not been consistently true in the post-simplification rollout era and should not be hard-coded without a year-specific qualifier.
- `fa-001`: “all T20 schools meet 100% of demonstrated need” is too absolute. Many top schools do, but “T20” is not an official category and this should not be universalized.
- `adm-007` and `adm-009`: treat yield protection as a settled, common explanation for denials/waitlists at elite-adjacent schools. This is plausible in some cases, but the wording is more confident than the evidence usually supports.
- `strategy-002`: “ED ... offers a significant admissions advantage — sometimes 2-3x higher acceptance rates” needs stronger qualification because raw ED rates often reflect applicant composition, recruited athletes, hooked applicants, and institutional priorities.
- `general-002`: “Focus on need-blind schools (mostly Ivies and some LACs)” is oversimplified and too imprecise for international-aid advising.
- `strategy-004`: “Building a relationship with your regional admissions officer can help you stand out” is reasonable at some schools, but the entry risks overstating the impact of light-touch contact.
- `interview-001`: “Research your interviewer if possible” is acceptable advice, but it should be framed carefully; excessive interviewer research can come off as awkward or unnecessary.

## Missing Categories of Insights

The current set is strong on selective private admissions, but it lacks several categories that would improve advising completeness:

- **College fit and academic environment**: how to evaluate teaching style, advising, undergraduate access, research access, and campus culture.
- **Major and career exploration**: choosing an intended major, undecided strategies, pre-professional pathways, and aligning college choice with long-term goals.
- **Application mechanics / operations**: portals, school-specific supplements, art/music portfolios, resumes, fee waivers, and document logistics.
- **Public universities and honors colleges**: merit scholarship strategy, honors programs, rolling admissions, and state flagship dynamics.
- **Special populations**: recruited artists, homeschool applicants, veterans, students with disciplinary records, and students seeking disability accommodations.

## Suggestions for Improvement

- Replace marketing-style or absolute claims with more defensible wording such as “often,” “can,” or “at some schools,” especially for yield protection, ED advantage, and admissions-officer relationship advice.
- Clean up the Harvard record by correcting the curriculum description and moving nonacademic items out of `academics.signaturePrograms`.
- Deduplicate overlapping insights and tighten category boundaries so each entry has a clearer purpose.
- Add a lightweight sourcing standard: each insight should cite a more concrete basis than broad labels like “research” or “best practices.”
- Expand the corpus beyond elite private admissions by adding insights for public flagships, honors colleges, major selection, and operational application guidance.

## Production Readiness

**Not fully ready for production use yet.**

It is close enough for internal testing or advisor review, but not yet strong enough for unsupervised production use where users will assume high factual precision. With one editing pass focused on factual qualification, deduplication, and category expansion, it could become production-ready.
