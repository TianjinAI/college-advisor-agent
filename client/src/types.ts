export interface StudentProfile {
  gpa: string;
  gpa_scale: 'Weighted' | 'Unweighted';
  ap_ib_classes: string;
  sat_score: string;
  act_score: string;
  class_rank: string;
  interests: string;
  intended_majors: string;
  budget: string;
  target_states: string;
  extracurriculars: string;
  summer_camps: string;
  awards_honors: string;
  ethnic_group: string;
  sex: string;
  school_type: 'Public' | 'Private' | 'Both' | '';
  documents: UploadedDocument[];
  targetSchools?: TargetSchool[];
  userId?: string;
}

export interface UploadedDocument {
  id: string;
  filename: string;
  type: 'resume' | 'essay' | 'other';
  uploadedAt: number;
  size: number;
}

export type AdmissionStrategy = 'ED' | 'EA' | 'REA' | 'RD' | '';
export type SchoolStatus = 'Reach' | 'Match' | 'Safety' | '';

export interface TargetSchool {
  id: string;                   // uuid
  name: string;
  intendedMajor: string;
  status: SchoolStatus;
  strategy: AdmissionStrategy;
  notes: string;
  locked: boolean;
  addedAt: number;              // Date.now()
  sourceSessions: string[];     // session ids where school was mentioned
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  source?: 'kb' | 'web' | 'hybrid';
  userId?: string;
}

export interface SchoolCategory {
  name: string;
  schools: string[];
}

export interface SchoolSelection {
  name: string;
  nonce: number;
}

export interface SessionMetadata {
  id: string;
  name: string;
  purpose?: string;
  created_at: string;
  updated_at: string;
}

// Essay review types
export interface EssaySubmission {
  id: string;
  userId: string;
  promptId: string;
  promptLabel: string;
  draftText: string;
  wordCount: number;
  submittedAt: number;
  revisionOf?: string; // parent essay ID for revisions
}

export interface EssayReview {
  id: string;
  essayId: string;
  content: string; // streaming markdown
  completedAt: number;
}

export interface EssayEntry extends EssaySubmission {
  review?: EssayReview;
}

export type AppMode = 'college' | 'fa';

// Financial Aid profile — matches server/src/types.ts FinancialProfile exactly
export interface FinancialProfile {
  dependency_status: 'dependent' | 'independent';
  household_size: number;
  num_in_college: number;
  parent_marital_status: string;
  parent_agi: number;
  parent_income_type: string;
  student_income: number;
  parent_savings: number;
  parent_investments: number;
  home_equity: number;
  business_assets: number;
  student_assets: number;
  balance_529: number;
  gpa: number;
  sat: number | null;
  act: number | null;
  class_rank: string;
  first_gen: boolean;
  state_of_residency: string;
  citizenship: string;
  special_circumstances: string;
}

// --- Sprint 1.4: FA Schools & Scholarships ---

// Financial Aid — School record shape (matches GET /api/fa/schools → { schools, total })
// Aligned with server/src/knowledge/financialAidManager.ts: SchoolFA
export interface FASchool {
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
  } | null;
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

// Financial Aid — Scholarship record shape (matches GET /api/fa/scholarships → { scholarships, total })
// Aligned with server/src/knowledge/financialAidManager.ts: Scholarship
export interface FAScholarshipEligibility {
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
}

export interface FAScholarship {
  id: string;
  name: string;
  sponsor: string;
  amount: string;              // e.g. "5000" or "10000–20000", NOT a number
  amount_min: number | null;
  amount_max: number | null;
  renewable: boolean;
  renewable_years: number | null;
  eligibility: FAScholarshipEligibility;
  deadline: string;
  application_url: string;
  award_count_per_year: number | null;
  selectivity: string;
  compatible_with_institutional_aid: boolean;
  stacking_notes: string;
  category: string[];          // array, not string
  tags: string[];
  notes: string;
}