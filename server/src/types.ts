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
  hooks?: string[];
  school_type?: string;
  [key: string]: unknown;
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

export interface SessionMetadata {
  id: string;
  name: string;
  purpose?: string;
  created_at: string;
  updated_at: string;
}
