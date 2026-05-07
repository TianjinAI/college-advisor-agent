export interface StudentProfile {
  gpa: string;
  sat_act: string;
  interests: string;
  budget: string;
  target_states: string;
  extracurriculars: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}
