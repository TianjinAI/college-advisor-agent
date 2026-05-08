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
  awards_honors: string;
  hooks: string[];
  school_type: 'Public' | 'Private' | 'Charter' | 'Homeschool' | '';
  userId?: string;
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
