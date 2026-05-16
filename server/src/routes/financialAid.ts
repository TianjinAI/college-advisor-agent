/**
 * Financial Aid REST API Routes
 * All endpoints are PUBLIC (no auth required) — KB data only.
 * FA manager loaded lazily on first request.
 */

import { Router } from 'express';
import faRetriever from '../knowledge/faRetriever.js';
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

// GET /api/fa/schools/:slug — single school by slug
router.get('/schools/:slug', async (req, res) => {
  try {
    await ensureFALoaded();
    const school = faRetriever.getManager().getSchool(req.params.slug);
    if (!school) return res.status(404).json({ error: 'School not found' });
    res.json({ school });
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
