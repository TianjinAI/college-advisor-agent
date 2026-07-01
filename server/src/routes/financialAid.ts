/**
 * Financial Aid REST API Routes
 * All endpoints are PUBLIC (no auth required) — KB data only.
 * FA manager loaded lazily on first request.
 */

import { Router } from 'express';
import faRetriever from '../knowledge/faRetriever.js';
import type { SchoolFA } from '../knowledge/financialAidManager.js';
import path from 'path';

const router = Router();

// Lazy-load helper
async function ensureFALoaded(): Promise<void> {
  if (!faRetriever.isLoaded()) {
    const dataDir = path.resolve(process.cwd(), './data/financial-aid');
    await faRetriever.load(dataDir);
  }
}

// GET /api/fa/schools — all schools
router.get('/schools', async (_req, res) => {
  try {
    await ensureFALoaded();
    const schools = faRetriever.getManager().getSchools();
    res.json({ schools, total: schools.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Income band helper ────────────────────────────────────────────

function getIncomeBand(income: number): string {
  if (income <= 30000) return 'band_0_30k';
  if (income <= 48000) return 'band_30_48k';
  if (income <= 75000) return 'band_48_75k';
  if (income <= 110000) return 'band_75_110k';
  return 'band_110k_plus';
}

// ─── Name normalizer ───────────────────────────────────────────────
// Normalize school names for fuzzy matching between college KB and FA KB
// (handles comma-vs-hyphen differences, e.g. "University of California-Los Angeles" vs "University of California, Los Angeles")
function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[.,/#!$%^&*;:{}=`~()]/g, '').replace(/[-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

// Fuzzy school name match: exact → normalized exact → substring containment
function findSchool(allSchools: SchoolFA[], query: string) {
  // 1. Exact
  let school = allSchools.find(s => s.name === query);
  if (school) return school;
  const normQ = normalizeName(query);
  // 2. Normalized exact
  school = allSchools.find(s => normalizeName(s.name) === normQ);
  if (school) return school;
  // 3. Substring: query is a prefix/suffix of FA name or vice versa
  school = allSchools.find(s => {
    const normS = normalizeName(s.name);
    return normS.startsWith(normQ) || normQ.startsWith(normS) || normS.includes(normQ) || normQ.includes(normS);
  });
  return school ?? null;
}

// GET /api/fa/schools/export-data — export FA data for selected schools by display name
// Query: ?schools=SchoolA,SchoolB&income=75000 (income is optional parent_agi for net price band matching)
// IMPORTANT: must be BEFORE /schools/:slug so "export-data" doesn't match as slug
router.get('/schools/export-data', async (req, res) => {
  try {
    await ensureFALoaded();
    const schoolNames = ((req.query.schools as string) || '').split(',').map(s => s.trim()).filter(Boolean);
    const income = req.query.income ? parseInt(req.query.income as string, 10) : null;
    const allSchools = faRetriever.getManager().getSchools();

    const result: Record<string, any> = {};
    for (const name of schoolNames) {
      // Try fuzzy school name match (exact → normalized → substring)
      const school = findSchool(allSchools, name);
      if (!school) continue;

      let netPrice: string;
      const np = school.net_price_by_income;
      if (np && income !== null && !isNaN(income)) {
        const band = getIncomeBand(income) as keyof typeof np;
        const val = np[band];
        netPrice = val != null ? `~$${val.toLocaleString()}` : 'Contact school for estimate';
      } else if (np) {
        // Default to median band when no income provided
        netPrice = `~$${np.band_48_75k?.toLocaleString() ?? 'Contact school for estimate'}`;
      } else {
        netPrice = 'Estimated net price available once FA profile complete.';
      }

      result[name] = {
        estimatedNetPrice: netPrice,
        cssProfileRequired: school.css_profile_required,
        fafsaRequired: school.fafsa_required,
        meetsFullNeed: school.meets_full_need,
        noLoanPolicy: school.no_loan_policy,
        faPriorityDeadline: school.fa_priority_deadline,
      };
    }

    res.json({ schools: result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/fa/scholarships — all scholarships
router.get('/scholarships', async (_req, res) => {
  try {
    await ensureFALoaded();
    const scholarships = faRetriever.getManager().getScholarships();
    res.json({ scholarships, total: scholarships.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/fa/scholarships/search — filtered scholarships
// Query params: category, gpa_min, income_max, first_gen, pell_eligible, state, grade_level
router.get('/scholarships/search', async (req, res) => {
  try {
    await ensureFALoaded();
    const filters: Record<string, string> = {};
    for (const key of ['category', 'gpa_min', 'income_max', 'first_gen', 'pell_eligible', 'state', 'grade_level']) {
      const val = req.query[key];
      if (typeof val === 'string' && val) filters[key] = val;
    }
    const scholarships = faRetriever.getManager().searchScholarships(filters);
    res.json({ scholarships, total: scholarships.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/fa/federal — all federal programs
router.get('/federal', async (_req, res) => {
  try {
    await ensureFALoaded();
    const programs = faRetriever.getManager().getFederalPrograms();
    res.json({ programs, total: programs.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/fa/federal/:id — single federal program by id
router.get('/federal/:id', async (req, res) => {
  try {
    await ensureFALoaded();
    const program = faRetriever.getManager().getFederalProgram(req.params.id);
    if (!program) return res.status(404).json({ error: 'Federal program not found' });
    res.json({ program });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/fa/state-grants — all state grants
router.get('/state-grants', async (_req, res) => {
  try {
    await ensureFALoaded();
    const grants = faRetriever.getManager().getStateGrants();
    res.json({ grants, total: grants.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
