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
  userId?: string;
}

export interface UploadedDocument {
  id: string;
  filename: string;
  type: 'resume' | 'essay' | 'other';
  uploadedAt: number;
  size: number;
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
