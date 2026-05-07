// WebSocket 消息类型定义

export interface WSMessage {
  type: string;
  payload: unknown;
}

// 客户端 → 服务端消息
export interface SendMessagePayload {
  content: string;
  profile?: StudentProfile;
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
  sat_act?: string;     // 标化成绩
  interests?: string;    // 感兴趣专业/方向
  budget?: string;       // 预算范围（年）
  target_states?: string;// 目标州（ comma separated）
  extracurriculars?: string;
  [key: string]: unknown;
}

// 连接初始化
export interface InitPayload {
  sessionId?: string;
}
