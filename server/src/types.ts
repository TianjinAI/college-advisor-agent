// WebSocket 消息类型定义

export interface WSMessage {
  type: string;
  payload: unknown;
}

// 客户端 → 服务端消息
export interface SendMessagePayload {
  content: string;
  profile?: StudentProfile;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  userId?: string;
  sessionId?: string;
  model?: string; // client-selected model override
}

export interface UpdateProfilePayload {
  profile: StudentProfile;
}

// 服务端 → 客户端消息
export interface TextDeltaPayload {
  text: string;
  done: boolean;        // 当前消息是否结束
  messageId: string;    // 用于前端拼接同一 message
}

export interface SystemPayload {
  text: string;
}

export interface ErrorPayload {
  text: string;
}

export interface ResultPayload {
  duration_ms: number;
  is_error: boolean;
  result?: string;
}

// 学生 Profile
export interface StudentProfile {
  gpa?: string;
  gpa_scale?: 'Weighted' | 'Unweighted';
  ap_ib_classes?: string;
  sat_score?: string;
  act_score?: string;
  class_rank?: string;
  interests?: string;
  intended_majors?: string;
  budget?: string;
  target_states?: string;
  extracurriculars?: string;
  awards_honors?: string;
  summer_camps?: string;
  ethnic_group?: string;
  sex?: string;
  school_type?: 'Public' | 'Private' | 'Both' | '';
  documents?: Array<{
    id: string;
    filename: string;
    type: 'resume' | 'essay' | 'other';
    uploadedAt: number;
    size: number;
  }>;
}

// 连接初始化
export interface InitPayload {
  sessionId?: string;
}

export interface SessionChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  source?: 'kb' | 'web' | 'hybrid';
  userId?: string;
}

// Extend Express Request to include auth payload from authMiddleware
declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
        username: string;
        displayName: string;
      };
    }
  }
}

export interface SessionMetadata {
  id: string;
  name: string;
  purpose?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Financial Profile — in-session only.
 * Lives in React state on the client, sent in WS payload,
 * injected into LLM system prompt. NEVER persisted to disk.
 */
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
