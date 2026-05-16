/**
 * Financial Aid Knowledge Manager
 * Loads school FA profiles, scholarships, federal programs, and state grants
 * from data/financial-aid/ into memory.
 */

import * as fs from 'fs';
import * as path from 'path';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface SchoolFA {
  id: string;
  name: string;
  meets_full_need: boolean;
  meets_full_need_notes: string;
  no_loan_policy: boolean;
  no_loan_notes: string;
  need_only: boolean;
  css_profile_required: boolean;
  fafsa_required: boolean;
  net_price_by_income: {
    band_0_30k: number;
    band_30_48k: number;
    band_48_75k: number;
    band_75_110k: number;
    band_110k_plus: number;
  };
  merit_aid_available: boolean;
  merit_thresholds: {
    gpa_floor: number;
    sat_floor: number | null;
    act_floor: number | null;
    notes: string;
  } | null;
  fa_priority_deadline: string;
  fa_regular_deadline: string;
  ed_available: boolean;
  ea_available: boolean;
  rea_available: boolean;
  ed_aid_implications: string;
  questbridge_partner: boolean;
  posse_partner: boolean;
  special_programs: string[];
  avg_aid_award: number;
  percent_need_met: number;
  appeal_policy: string;
  international_aid_available: boolean;
  source_urls: string[];
  last_verified: string;
}

export interface Scholarship {
  id: string;
  name: string;
  sponsor: string;
  amount: string;
  amount_min: number | null;
  amount_max: number | null;
  renewable: boolean;
  renewable_years: number | null;
  eligibility: {
    gpa_min: number | null;
    sat_min: number | null;
    act_min: number | null;
    income_max: number | null;
    first_gen_required: boolean;
    pell_eligible_required: boolean;
    citizenship: string;
    race_ethnicity: string[];
    gender: string;
    grade_level: string;
    state_required: string | null;
    other_requirements: string;
  };
  deadline: string;
  application_url: string;
  award_count_per_year: number | null;
  selectivity: string;
  compatible_with_institutional_aid: boolean;
  stackable_notes: string;
  stacking_notes?: string; // optional — data may have only stackable_notes
  category: string[];
  tags: string[];
  notes: string;
}

export interface FederalProgram {
  id: string;
  name: string;
  type: string;
  administered_by: string;
  description: string;
  eligibility: string;
  award_amount: string;
  application_process: string;
  timeline: string;
  advisor_notes: string;
  source_urls: string[];
  last_verified: string;
}

export interface StateGrant extends FederalProgram {
  state: string;
  stacking_notes: string;
}

// ─── Validation helpers ────────────────────────────────────────────────────────

const SCHOOL_FA_REQUIRED = ['id', 'name', 'meets_full_need', 'fafsa_required', 'need_only'];
const FEDERAL_REQUIRED = ['id', 'name', 'type', 'description'];
const STATE_REQUIRED = ['id', 'name', 'state'];
const SCHOLARSHIP_REQUIRED = ['id', 'name', 'sponsor', 'amount', 'deadline'];

function validateRequired(obj: any, requiredFields: string[], label: string): void {
  const missing: string[] = [];
  for (const f of requiredFields) {
    if (obj[f] === undefined || obj[f] === null) {
      missing.push(f);
    }
  }
  if (missing.length > 0) {
    console.warn(`[FA-KB] Validation warning for ${label}: missing fields [${missing.join(', ')}]`);
  }
}

// ─── Manager ───────────────────────────────────────────────────────────────────

export class FinancialAidManager {
  private schools: SchoolFA[] = [];
  private schoolsBySlug: Map<string, SchoolFA> = new Map();
  private scholarships: Scholarship[] = [];
  private federalPrograms: FederalProgram[] = [];
  private federalById: Map<string, FederalProgram> = new Map();
  private stateGrants: StateGrant[] = [];
  private loaded = false;
  private loadingPromise: Promise<void> | null = null;

  async load(dataDir: string): Promise<void> {
    // Guard: already loaded → return immediately
    if (this.loaded) return;
    // Guard: load in progress → wait for it to finish
    if (this.loadingPromise) {
      await this.loadingPromise;
      return;
    }

    this.loadingPromise = this._doLoad(dataDir);
    await this.loadingPromise;
    this.loadingPromise = null;
  }

  private async _doLoad(dataDir: string): Promise<void> {
    // ── Schools ───────────────────────────────────────────────────────────
    const schoolsDir = path.join(dataDir, 'schools');
    if (fs.existsSync(schoolsDir)) {
      const files = fs.readdirSync(schoolsDir).filter(f => f.endsWith('.json'));
      for (const file of files) {
        const raw = fs.readFileSync(path.join(schoolsDir, file), 'utf-8');
        const school = JSON.parse(raw);
        validateRequired(school, SCHOOL_FA_REQUIRED, `school ${file}`);
        this.schools.push(school as SchoolFA);
        this.schoolsBySlug.set(school.id, school);
      }
    }

    // ── Scholarships ──────────────────────────────────────────────────────
    const scholarshipsDir = path.join(dataDir, 'scholarships');
    if (fs.existsSync(scholarshipsDir)) {
      const files = fs.readdirSync(scholarshipsDir).filter(f => f.endsWith('.json'));
      for (const file of files) {
        const raw = fs.readFileSync(path.join(scholarshipsDir, file), 'utf-8');
        const parsed = JSON.parse(raw);
        validateRequired(parsed, SCHOLARSHIP_REQUIRED, `scholarship ${file}`);
        // Normalize: map between stackable_notes / stacking_notes
        if (parsed.stackable_notes && !parsed.stacking_notes) {
          parsed.stacking_notes = parsed.stackable_notes;
        }
        if (!parsed.stackable_notes && parsed.stacking_notes) {
          parsed.stackable_notes = parsed.stacking_notes;
        }
        this.scholarships.push(parsed as Scholarship);
      }
    }

    // ── Federal Programs ──────────────────────────────────────────────────
    const federalDir = path.join(dataDir, 'federal');
    if (fs.existsSync(federalDir)) {
      // Filter to only .json FILES (skip subdirectories like state-grants/)
      const entries = fs.readdirSync(federalDir, { withFileTypes: true });
      const files = entries
        .filter(e => e.isFile() && e.name.endsWith('.json'))
        .map(e => e.name);
      for (const file of files) {
        const raw = fs.readFileSync(path.join(federalDir, file), 'utf-8');
        const program = JSON.parse(raw);
        validateRequired(program, FEDERAL_REQUIRED, `federal ${file}`);
        this.federalPrograms.push(program as FederalProgram);
        this.federalById.set(program.id, program);
      }

      // ── State Grants ───────────────────────────────────────────────────
      const stateDir = path.join(federalDir, 'state-grants');
      if (fs.existsSync(stateDir)) {
        const stateFiles = fs.readdirSync(stateDir).filter(f => f.endsWith('.json'));
        for (const file of stateFiles) {
          const raw = fs.readFileSync(path.join(stateDir, file), 'utf-8');
          const grant = JSON.parse(raw);
          validateRequired(grant, STATE_REQUIRED, `state grant ${file}`);
          this.stateGrants.push(grant as StateGrant);
        }
      }
    }

    this.loaded = true;
    console.log(
      `[FA-KB] Loaded ${this.schools.length} schools, ${this.scholarships.length} scholarships, ` +
      `${this.federalPrograms.length} federal programs, ${this.stateGrants.length} state grants`
    );
  }

  // ─── Accessors ───────────────────────────────────────────────────────────────

  getSchools(): SchoolFA[] {
    return this.schools;
  }

  getSchool(slug: string): SchoolFA | undefined {
    return this.schoolsBySlug.get(slug);
  }

  getScholarships(): Scholarship[] {
    return this.scholarships;
  }

  searchScholarships(filters: Record<string, string>): Scholarship[] {
    return this.scholarships.filter(s => {
      if (filters.category && !(s.category || []).includes(filters.category)) return false;

      if (filters.gpa_min) {
        const req = parseFloat(filters.gpa_min);
        if (isNaN(req)) return true; // bad input → skip filter
        if (s.eligibility.gpa_min != null && s.eligibility.gpa_min > req) return false;
      }
      if (filters.income_max) {
        const max = parseInt(filters.income_max, 10);
        if (isNaN(max)) return true;
        if (s.eligibility.income_max != null && s.eligibility.income_max < max) return false;
      }

      // first_gen filter: user is first-gen → show ALL compatible scholarships.
      // Since no scholarship excludes first-gen students, this filter is a no-op
      // for "show me what I'm eligible for". We keep the param for future use
      // if a "first-gen exclusive" mode is needed (then check first_gen_required).
      //
      // Same for pell_eligible.

      if (filters.state && s.eligibility.state_required &&
          s.eligibility.state_required !== filters.state) return false;

      if (filters.grade_level && s.eligibility.grade_level) {
        const target = filters.grade_level.toLowerCase();
        const haystack = s.eligibility.grade_level.toLowerCase();
        // Token-based match: split on word boundaries for better partial matching
        const tokens = haystack.split(/[\s,/]+/).filter(Boolean);
        if (!tokens.some(t => target.includes(t) || t.includes(target))) return false;
      }
      return true;
    });
  }

  getFederalPrograms(): FederalProgram[] {
    return this.federalPrograms;
  }

  getFederalProgram(id: string): FederalProgram | undefined {
    return this.federalById.get(id);
  }

  getStateGrants(): StateGrant[] {
    return this.stateGrants;
  }

  // ─── Search (keyword search across ALL layers for RAG) ──────────────────────

  search(query: string): string {
    const lowerQ = query.toLowerCase();
    const terms = lowerQ.split(/\s+/).filter(t => t.length > 1); // allow 2-char terms (FA, ED)
    const parts: string[] = [];

    // Search schools
    const schoolMatches = this.searchSchools(terms);
    if (schoolMatches.length > 0) {
      parts.push('## Financial Aid: School Profiles (from knowledge base)');
      for (const school of schoolMatches) {
        parts.push(this.formatSchool(school));
      }
    }

    // Search scholarships
    const scholarshipMatches = this.searchScholarshipsByTerms(terms);
    if (scholarshipMatches.length > 0) {
      parts.push('## Financial Aid: Scholarship Matches (from knowledge base)');
      for (const s of scholarshipMatches) {
        parts.push(this.formatScholarship(s));
      }
    }

    // Search federal programs
    const federalMatches = this.searchFederalPrograms(terms);
    if (federalMatches.length > 0) {
      parts.push('## Financial Aid: Federal Programs (from knowledge base)');
      for (const fp of federalMatches) {
        parts.push(this.formatFederalProgram(fp));
      }
    }

    // Search state grants
    const stateMatches = this.searchStateGrants(terms);
    if (stateMatches.length > 0) {
      parts.push('## Financial Aid: State Grants (from knowledge base)');
      for (const sg of stateMatches) {
        parts.push(this.formatStateGrant(sg));
      }
    }

    return parts.join('\n\n');
  }

  // ─── Private search helpers ──────────────────────────────────────────────────

  /** Filter out null/undefined values before joining — prevents "null" in search index */
  private safeJoin(...values: Array<string | number | null | undefined>): string {
    return values.filter(v => v != null && v !== '').join(' ');
  }

  private buildSchoolSearchText(s: SchoolFA): string {
    return [
      this.safeJoin(s.name, s.id, s.meets_full_need_notes, s.no_loan_notes,
                     s.ed_aid_implications, s.appeal_policy),
      ...(s.special_programs || []).filter(Boolean),
      ...(s.source_urls || []).filter(Boolean),
    ].join(' ').toLowerCase();
  }

  private buildScholarshipSearchText(s: Scholarship): string {
    return [
      this.safeJoin(s.name, s.sponsor, s.amount, s.notes,
                     s.selectivity, s.stacking_notes ?? ''),
      this.safeJoin(s.eligibility.citizenship, s.eligibility.other_requirements,
                     s.eligibility.gender, s.eligibility.grade_level),
      ...(s.category || []).filter(Boolean),
      ...(s.tags || []).filter(Boolean),
      ...(s.eligibility.race_ethnicity || []).filter(Boolean),
    ].join(' ').toLowerCase();
  }

  private buildFederalSearchText(fp: FederalProgram): string {
    return this.safeJoin(
      fp.name, fp.type, fp.description,
      fp.eligibility, fp.award_amount,
      fp.application_process, fp.timeline,
      fp.advisor_notes,
    ).toLowerCase();
  }

  private buildStateGrantSearchText(sg: StateGrant): string {
    return this.safeJoin(
      sg.name, sg.state, sg.type, sg.description,
      sg.eligibility, sg.award_amount, sg.stacking_notes,
      sg.advisor_notes,
    ).toLowerCase();
  }

  private scoreTerms(text: string, terms: string[]): number {
    let score = 0;
    for (const term of terms) {
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const matches = text.match(new RegExp(escaped, 'g'));
      if (matches) score += matches.length * 5;
    }
    return score;
  }

  private searchSchools(terms: string[]): SchoolFA[] {
    const scored = this.schools
      .map(s => ({ school: s, score: this.scoreTerms(this.buildSchoolSearchText(s), terms) }))
      .filter(r => r.score > 0);
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 4).map(r => r.school);
  }

  private searchScholarshipsByTerms(terms: string[]): Scholarship[] {
    const scored = this.scholarships
      .map(s => ({ scholarship: s, score: this.scoreTerms(this.buildScholarshipSearchText(s), terms) }))
      .filter(r => r.score > 0);
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 4).map(r => r.scholarship);
  }

  private searchFederalPrograms(terms: string[]): FederalProgram[] {
    const scored = this.federalPrograms
      .map(fp => ({ program: fp, score: this.scoreTerms(this.buildFederalSearchText(fp), terms) }))
      .filter(r => r.score > 0);
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 3).map(r => r.program);
  }

  private searchStateGrants(terms: string[]): StateGrant[] {
    const scored = this.stateGrants
      .map(sg => ({ grant: sg, score: this.scoreTerms(this.buildStateGrantSearchText(sg), terms) }))
      .filter(r => r.score > 0);
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 3).map(r => r.grant);
  }

  // ─── Formatters for RAG context ─────────────────────────────────────────────

  private formatSchool(s: SchoolFA): string {
    const lines: string[] = [
      `### ${s.name} (${s.id})`,
      `- Full Need Met: ${s.meets_full_need ? 'Yes' : 'No'} — ${s.meets_full_need_notes || 'N/A'}`,
      `- No-Loan Policy: ${s.no_loan_policy ? 'Yes' : 'No'} — ${s.no_loan_notes || 'N/A'}`,
      `- Need-Only: ${s.need_only ? 'Yes' : 'No'}`,
      `- CSS Profile Required: ${s.css_profile_required ? 'Yes' : 'No'} | FAFSA Required: ${s.fafsa_required ? 'Yes' : 'No'}`,
    ];

    const np = s.net_price_by_income;
    if (np) {
      lines.push(`- Net Price: <$30k=$${np.band_0_30k ?? '?'} | $30-48k=$${np.band_30_48k ?? '?'} | $48-75k=$${np.band_48_75k ?? '?'} | $75-110k=$${np.band_75_110k ?? '?'} | >$110k=$${np.band_110k_plus ?? '?'}`);
    }

    if (s.merit_aid_available) {
      const mt = s.merit_thresholds;
      lines.push(`- Merit Aid: Available${mt ? ` (GPA≥${mt.gpa_floor ?? '?'}, SAT≥${mt.sat_floor ?? 'N/A'}, ACT≥${mt.act_floor ?? 'N/A'}) — ${mt.notes || ''}` : ''}`);
    }

    lines.push(`- FA Priority Deadline: ${s.fa_priority_deadline || 'N/A'} | Regular: ${s.fa_regular_deadline || 'N/A'}`);
    lines.push(`- Early Options: ED=${s.ed_available ? 'Yes' : 'No'} EA=${s.ea_available ? 'Yes' : 'No'} REA=${s.rea_available ? 'Yes' : 'No'}`);

    if (s.ed_available && s.ed_aid_implications) {
      lines.push(`- ED Aid Implications: ${s.ed_aid_implications}`);
    }

    lines.push(`- QuestBridge: ${s.questbridge_partner ? 'Yes' : 'No'} | Posse: ${s.posse_partner ? 'Yes' : 'No'}`);
    if (s.special_programs?.length) {
      lines.push(`- Special Programs: ${s.special_programs.join(', ')}`);
    }
    lines.push(`- Avg Aid Award: $${s.avg_aid_award?.toLocaleString() ?? 'N/A'} | Need Met: ${s.percent_need_met ?? 'N/A'}%`);
    if (s.appeal_policy) lines.push(`- Appeal Policy: ${s.appeal_policy}`);
    lines.push(`- International Aid: ${s.international_aid_available ? 'Yes' : 'No'}`);

    return lines.join('\n');
  }

  private formatScholarship(s: Scholarship): string {
    const cat = s.category ?? [];
    const tags = s.tags ?? [];

    const lines: string[] = [
      `### ${s.name} (${s.id})`,
      `- Sponsor: ${s.sponsor || 'N/A'}`,
      `- Amount: ${s.amount || 'N/A'}`,
      `- Renewable: ${s.renewable ? `Yes (${s.renewable_years ?? '?'} years)` : 'No'}`,
      `- Deadline: ${s.deadline || 'N/A'}`,
      `- Selectivity: ${s.selectivity || 'N/A'}`,
      `- Categories: ${cat.length ? cat.join(', ') : 'N/A'}`,
      `- Tags: ${tags.length ? tags.join(', ') : 'N/A'}`,
    ];

    if (s.eligibility) {
      const e = s.eligibility;
      const eligibilityParts: string[] = [];
      if (e.gpa_min != null) eligibilityParts.push(`GPA≥${e.gpa_min}`);
      if (e.sat_min != null) eligibilityParts.push(`SAT≥${e.sat_min}`);
      if (e.act_min != null) eligibilityParts.push(`ACT≥${e.act_min}`);
      if (e.income_max != null) eligibilityParts.push(`Income≤$${e.income_max.toLocaleString()}`);
      if (e.first_gen_required) eligibilityParts.push('First-gen required');
      if (e.pell_eligible_required) eligibilityParts.push('Pell eligible required');
      if (e.citizenship) eligibilityParts.push(e.citizenship);
      if (e.state_required) eligibilityParts.push(`State: ${e.state_required}`);
      if (e.race_ethnicity?.length) eligibilityParts.push(`Ethnicity: ${e.race_ethnicity.join(', ')}`);
      if (eligibilityParts.length) lines.push(`- Eligibility: ${eligibilityParts.join('; ')}`);
    }

    if (s.stacking_notes) lines.push(`- Stacking: ${s.stacking_notes}`);
    if (s.notes) lines.push(`- Notes: ${s.notes.substring(0, 300)}`);

    return lines.join('\n');
  }

  private formatFederalProgram(fp: FederalProgram): string {
    return [
      `### ${fp.name} (${fp.id})`,
      `- Type: ${fp.type || 'N/A'}`,
      `- Description: ${fp.description || 'N/A'}`,
      `- Eligibility: ${fp.eligibility || 'N/A'}`,
      `- Award: ${fp.award_amount || 'N/A'}`,
      `- Timeline: ${fp.timeline || 'N/A'}`,
      `- Advisor Notes: ${fp.advisor_notes || 'N/A'}`,
    ].join('\n');
  }

  private formatStateGrant(sg: StateGrant): string {
    return [
      `### ${sg.name} (${sg.id}) — ${sg.state || 'N/A'}`,
      `- Description: ${sg.description || 'N/A'}`,
      `- Eligibility: ${sg.eligibility || 'N/A'}`,
      `- Award: ${sg.award_amount || 'N/A'}`,
      `- Timeline: ${sg.timeline || 'N/A'}`,
      `- Stacking: ${sg.stacking_notes || 'N/A'}`,
      `- Advisor Notes: ${sg.advisor_notes || 'N/A'}`,
    ].join('\n');
  }
}
