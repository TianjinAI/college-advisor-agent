import { promises as fs } from 'fs';
import path from 'path';
import type { SessionChatMessage, SessionMetadata } from '../types.js';

export class DossierManager {
  private baseDir: string;

  constructor(baseDir: string) {
    this.baseDir = baseDir;
  }

  private getSafeId(userId: string): string {
    return userId.replace(/[^a-zA-Z0-9_-]/g, '_');
  }

  getUserDir(userId: string): string {
    return path.join(this.baseDir, this.getSafeId(userId));
  }

  getDossierPath(userId: string): string {
    return path.join(this.getUserDir(userId), 'dossier.md');
  }

  getConversationPath(userId: string): string {
    return path.join(this.getUserDir(userId), 'conversations.md');
  }

  getSessionsDir(userId: string): string {
    return path.join(this.getUserDir(userId), 'sessions');
  }

  getSessionDir(userId: string, sessionId: string): string {
    return path.join(this.getSessionsDir(userId), this.getSafeId(sessionId));
  }

  getSessionMetadataPath(userId: string, sessionId: string): string {
    return path.join(this.getSessionDir(userId, sessionId), 'metadata.json');
  }

  getSessionChatPath(userId: string, sessionId: string): string {
    return path.join(this.getSessionDir(userId, sessionId), 'chat.json');
  }

  private createSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  private async readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
    try {
      const raw = await fs.readFile(filePath, 'utf8');
      return JSON.parse(raw) as T;
    } catch (error: any) {
      if (error?.code === 'ENOENT') return fallback;
      throw error;
    }
  }

  private async ensureDefaultSession(userId: string): Promise<SessionMetadata> {
    const existing = await this.listExistingSessions(userId);
    if (existing.length > 0) {
      return existing[0];
    }
    return this.createSession(userId, 'General Advising');
  }

  private async listExistingSessions(userId: string): Promise<SessionMetadata[]> {
    const sessionsDir = this.getSessionsDir(userId);

    try {
      const entries = await fs.readdir(sessionsDir, { withFileTypes: true });
      const sessions = await Promise.all(entries
        .filter((entry) => entry.isDirectory())
        .map(async (entry) => {
          const metadataPath = path.join(sessionsDir, entry.name, 'metadata.json');
          return this.readJsonFile<SessionMetadata | null>(metadataPath, null);
        }));

      return sessions
        .filter((session): session is SessionMetadata => Boolean(session))
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    } catch (error: any) {
      if (error?.code === 'ENOENT') return [];
      throw error;
    }
  }

  // ─── User profile (display name + student profile) ───────────────────

  private getUserProfilePath(userId: string): string {
    return path.join(this.getUserDir(userId), 'profile.json');
  }

  private async readUserProfile(userId: string): Promise<Record<string, unknown>> {
    try {
      const raw = await fs.readFile(this.getUserProfilePath(userId), 'utf8');
      return JSON.parse(raw) as Record<string, unknown>;
    } catch (error: any) {
      if (error?.code === 'ENOENT') return {};
      throw error;
    }
  }

  private async writeUserProfile(userId: string, profile: Record<string, unknown>): Promise<void> {
    const filePath = this.getUserProfilePath(userId);
    const dirPath = path.dirname(filePath);
    await fs.mkdir(dirPath, { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(profile, null, 2), 'utf8');
  }

  async getUserProfile(userId: string): Promise<Record<string, unknown>> {
    return this.readUserProfile(userId);
  }

  async getDisplayName(userId: string): Promise<string> {
    const profile = await this.readUserProfile(userId);
    return typeof profile.displayName === 'string' ? profile.displayName : '';
  }

  async setDisplayName(userId: string, displayName: string): Promise<void> {
    const profile = await this.readUserProfile(userId);
    profile.displayName = displayName.trim();
    await this.writeUserProfile(userId, profile);
  }

  async getStudentProfile(userId: string): Promise<import('../types.js').StudentProfile> {
    const profile = await this.readUserProfile(userId);
    return (profile.studentProfile as import('../types.js').StudentProfile) || {};
  }

  async setStudentProfile(userId: string, studentProfile: import('../types.js').StudentProfile): Promise<void> {
    const profile = await this.readUserProfile(userId);
    profile.studentProfile = studentProfile;
    await this.writeUserProfile(userId, profile);
  }

  // ─── Dossier (student profile Wiki page) ─────────────────────────────

  async loadDossier(userId: string): Promise<string> {
    try {
      const raw = await fs.readFile(this.getDossierPath(userId), 'utf8');
      // Strip frontmatter for system prompt injection (keep body only)
      const bodyMatch = raw.match(/^---[\s\S]*?---\n*/);
      return bodyMatch ? raw.slice(bodyMatch[0].length).trim() : raw.trim();
    } catch (error: any) {
      if (error?.code === 'ENOENT') return '';
      throw error;
    }
  }

  async loadDossierRaw(userId: string): Promise<string> {
    try {
      return await fs.readFile(this.getDossierPath(userId), 'utf8');
    } catch (error: any) {
      if (error?.code === 'ENOENT') return '';
      throw error;
    }
  }

  /**
   * Save the full dossier Wiki page (replaces, doesn't append).
   * The LLM returns a complete updated page; we add frontmatter.
   */
  async saveDossier(userId: string, wikiContent: string, sourceSummary?: string): Promise<void> {
    const cleanContent = wikiContent.trim();
    if (!cleanContent || cleanContent === 'NO_NEW_FACTS') return;

    const filePath = this.getDossierPath(userId);
    const dirPath = path.dirname(filePath);
    await fs.mkdir(dirPath, { recursive: true });

    const now = new Date().toISOString();
    const dateStr = now.split('T')[0];

    // Build frontmatter
    const existing = await this.loadDossierRaw(userId);
    let sourceCount = 1;
    if (existing) {
      const countMatch = existing.match(/source_count:\s*(\d+)/);
      sourceCount = (countMatch ? parseInt(countMatch[1]) : 0) + 1;
    }

    const frontmatter = [
      '---',
      `domain: College-Advisor`,
      `status: draft`,
      `created: ${existing ? existing.match(/created:\s*(.+)/)?.[1] || dateStr : dateStr}`,
      `updated: ${dateStr}`,
      `source_count: ${sourceCount}`,
      sourceSummary ? `last_source: "${sourceSummary}"` : '',
      '---',
      '',
    ].filter(Boolean).join('\n');

    await fs.writeFile(filePath, frontmatter + cleanContent + '\n', 'utf8');
  }

  // ─── Conversations (Q&A log) ───────────────────────────────────────────

  async loadConversations(userId: string): Promise<string> {
    try {
      return await fs.readFile(this.getConversationPath(userId), 'utf8');
    } catch (error: any) {
      if (error?.code === 'ENOENT') return '';
      throw error;
    }
  }

  async appendConversation(
    userId: string,
    userMessage: string,
    responseSummary: string,
  ): Promise<void> {
    const filePath = this.getConversationPath(userId);
    const dirPath = path.dirname(filePath);
    const timestamp = new Date().toISOString();
    const date = timestamp.split('T')[0];

    await fs.mkdir(dirPath, { recursive: true });

    const existing = await this.loadConversations(userId);
    
    // Truncate user message for readability
    const truncatedMsg = userMessage.length > 200 
      ? userMessage.substring(0, 200) + '...' 
      : userMessage;
    
    // Truncate response summary
    const truncatedSummary = responseSummary.length > 300
      ? responseSummary.substring(0, 300) + '...'
      : responseSummary;

    const entry = [
      `### ${timestamp}`,
      `**Q**: ${truncatedMsg}`,
      `**A**: ${truncatedSummary}`,
      '',
    ].join('\n');

    if (!existing) {
      const initial = [
        '# Conversation History',
        `**Last session**: ${timestamp}`,
        '',
        '---',
        '',
        entry,
      ].join('\n');
      await fs.writeFile(filePath, initial, 'utf8');
      return;
    }

    // Update last session timestamp and append
    const updated = existing
      .replace(/^\*\*Last session\*\*: .*$/m, `**Last session**: ${timestamp}`)
      .trimEnd();

    await fs.writeFile(filePath, updated + '\n\n' + entry, 'utf8');
  }

  // ─── Combined context for LLM injection ────────────────────────────────

  async loadFullContext(userId: string): Promise<string> {
    const parts: string[] = [];
    
    const dossier = await this.loadDossier(userId);
    if (dossier) {
      parts.push('## Student Dossier (Persistent Profile)\n' + dossier);
    }

    const conversations = await this.loadConversations(userId);
    if (conversations) {
      // Only include last ~3000 chars of conversations to stay within context
      const trimmed = conversations.length > 4000
        ? '...(earlier conversations omitted)\n\n' + conversations.slice(-4000)
        : conversations;
      parts.push('## Previous Conversations\n' + trimmed);
    }

    return parts.join('\n\n---\n\n');
  }

  async listSessions(userId: string): Promise<SessionMetadata[]> {
    await this.ensureDefaultSession(userId);
    return this.listExistingSessions(userId);
  }

  async createSession(userId: string, name: string, purpose?: string): Promise<SessionMetadata> {
    const sessionId = this.createSessionId();
    const now = new Date().toISOString();
    const metadata: SessionMetadata = {
      id: sessionId,
      name: name.trim() || 'Untitled Session',
      purpose: purpose?.trim() || undefined,
      created_at: now,
      updated_at: now,
    };

    const sessionDir = this.getSessionDir(userId, sessionId);
    await fs.mkdir(sessionDir, { recursive: true });
    await fs.writeFile(this.getSessionMetadataPath(userId, sessionId), JSON.stringify(metadata, null, 2), 'utf8');
    await fs.writeFile(this.getSessionChatPath(userId, sessionId), '[]', 'utf8');

    return metadata;
  }

  async loadMessages(userId: string, sessionId: string): Promise<SessionChatMessage[]> {
    await this.ensureDefaultSession(userId);
    return this.readJsonFile<SessionChatMessage[]>(this.getSessionChatPath(userId, sessionId), []);
  }

  async saveMessages(userId: string, sessionId: string, messages: SessionChatMessage[]): Promise<SessionChatMessage[]> {
    await this.ensureDefaultSession(userId);

    const trimmed = messages
      .slice(-200)
      .map((message) => ({
        id: message.id,
        role: message.role,
        content: message.content,
        timestamp: message.timestamp,
        source: message.source,
        userId: message.userId,
      }));

    const metadataPath = this.getSessionMetadataPath(userId, sessionId);
    const chatPath = this.getSessionChatPath(userId, sessionId);
    const sessionDir = this.getSessionDir(userId, sessionId);

    await fs.mkdir(sessionDir, { recursive: true });
    await fs.writeFile(chatPath, JSON.stringify(trimmed, null, 2), 'utf8');

    const existingMetadata = await this.readJsonFile<SessionMetadata | null>(metadataPath, null);
    const now = new Date().toISOString();
    const metadata: SessionMetadata = existingMetadata ?? {
      id: sessionId,
      name: 'General Advising',
      created_at: now,
      updated_at: now,
    };
    metadata.updated_at = now;

    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');
    return trimmed;
  }
}
